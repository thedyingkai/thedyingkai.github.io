---
title: 华为挑战赛：端云协同调度复现
description: ICPC 2026 华为挑战赛终测第 10 名方案，介绍端云协同推理的瓶颈建模、在线动作价值、Decode 准入、批处理与复现验证。
date: 2026.10.12
tags: [ICPC, 华为挑战赛, Codeforces, 启发式优化, 调度算法]
---

本文整理 Codeforces 2251A 的最终调度方案。[官方终测榜单](https://codeforces.com/contest/2251/standings)中，thedyingkai_ 位列**第 10 名，累计分 15247.457**。

方案采用瓶颈感知的在线调度：把吞吐量、请求准备等待和相邻 token 间隔转化为可比较的动作价值，再结合资源占用、批处理收益和链路排队选择任务。

## 比赛与成绩

比赛的官方名称是 **ICPC 2026 Online Challenge 1 powered by Huawei**，于北京时间 **2026 年 8 月 14 日 19:00 至 8 月 28 日 18:59**举行。[官方公告](https://codeforces.com/blog/entry/155646?locale=en)将第 7—16 名列为 Second Prize 档位，奖金为 €3,000。

题目 **Edge–Cloud Collaborative Scheduling** 来自大语言模型的端云协同推理：模型的首尾层在 Edge 执行，中间层交给 Cloud；Prefill 和每一轮 Decode 都需要经过计算与传输。调度器需要让不同请求的计算、通信尽量重叠，同时兼顾系统吞吐和请求等待目标。[比赛入口](https://codeforces.com/contest/2251)与[完整题面](https://codeforces.com/contest/2251/problem/A)给出了系统参数、交互协议和计分规则。

复现按系统模型、在线状态、容量规划、动作评价和交互验证展开。公式给出决策依据，状态与流程说明各模块的衔接，可以据此独立实现调度器和验证器。

## 1 系统模型与优化目标

### 1.1 请求执行链

系统包含一台 Edge、K 台相同的 Cloud，以及 UP、DOWN 两条独立的 FIFO 传输队列。每台计算设备同时执行一个任务，每个方向的链路同时处理一次传输。不同设备之间、计算与传输之间可以重叠。

每个请求先执行一次 Prefill，再重复执行 Decode，每轮 Decode 产生一个 token：

- Prefill：Edge 上的 P PRE → UP 传输 → Cloud 上的 P PROC → DOWN 传输 → Edge 上的 P POST。
- Decode：Edge 上的 D PRE → UP 传输 → Cloud 上的 D PROC → DOWN 传输 → Edge 上的 D POST。

P PRE 时确定请求所属的 Cloud，后续 Cloud 计算使用这一固定分配。D PRE 与 D POST 可以合并来自不同 Cloud 的请求；D PROC 的成员必须属于同一台 Cloud。跨 Cloud 的 D PRE 完成后，各 Cloud 的 UP 传输按编号递增的顺序入队。

请求的输入长度在到达时给出，总输出长度在完成时才被确认。总请求数量也不提前给出。因此，容量与等待估计必须随事件更新。

### 1.2 计算与传输耗时

记 \(C_s(x)\) 为阶段 \(s\) 的计算耗时，不含调度开销。普通任务的占用时间为

\[
d_s(x)=S+C_s(x).
\]

Prefill 的 \(x\) 是输入长度，Decode 的 \(x\) 是批次成员数量。各阶段的耗时曲线分别由输入表做分段线性插值；缺失值跳过，区间外取最近端点。P PROC 执行层区间 \([l_1,l_2)\) 时，占用时间为

\[
S+C_{\mathrm{Pproc}}(L_{\mathrm{in}})
\frac{l_2-l_1}{N_{\mathrm{layers}}}.
\]

携带 \(n\) 个 token 单位数据的传输耗时为

\[
T(n)=\ell+
\frac{8nB}{W\cdot10^6},
\]

其中 \(\ell\) 为固定链路延迟，\(B\) 为每 token 的字节数，\(W\) 为以 Gbps 表示的带宽。计算和传输时间均以 ms 表示。Prefill 传输的 \(n\) 为输入长度，Decode 传输的 \(n\) 为该次传输携带的请求数。

一个跨 Cloud 的 Edge 批次会触发多次传输。若它涉及 \(q\) 台 Cloud、共 \(m\) 个请求，UP 总工作量为

\[
q\ell+\frac{8mB}{W\cdot10^6}.
\]

所以批次规模与 Cloud 分布需要一起规划。

### 1.3 计分定义

设全部请求产生的 token 总量为 \(N\)，最早请求到达时刻为 \(t_0\)，最后一个 token 的产生时刻为 \(t_f\)。吞吐量为

\[
\mathrm{TP}=\frac{N}{t_f-t_0}.
\]

TDR 是每个请求从到达到 P POST 完成的等待时间的平均值。TPOT 是所有请求的全部相邻 token 时间差的总体平均值；没有相邻 token 间隔时取零。

给定等待目标 \(S_1,S_2\)，定义

\[
e_1=\max\left(0,\frac{\mathrm{TDR}}{S_1}-1\right),\qquad
e_2=\max\left(0,\frac{\mathrm{TPOT}}{S_2}-1\right),
\]

\[
D=\sqrt{e_1^2+e_2^2}.
\]

吞吐收益与等待收益分别为

\[
F_{\mathrm{TP}}=
\operatorname{clip}\left(
\frac{\mathrm{TP}-\mathrm{TP}_{\mathrm{base}}}
{\mathrm{TP}_{\mathrm{UB}}-\mathrm{TP}_{\mathrm{base}}},
0,1\right),
\]

\[
F_{\mathrm{wait}}=
\begin{cases}
\max(0,1-D/D_{\mathrm{base}}), & D_{\mathrm{base}}>0,\\
1, & D_{\mathrm{base}}=0,\ D=0,\\
0, & D_{\mathrm{base}}=0,\ D>0.
\end{cases}
\]

单组得分为

\[
1000\left(w_{\mathrm{TP}}F_{\mathrm{TP}}
+w_{\mathrm{wait}}F_{\mathrm{wait}}\right).
\]

TDR 在 P POST 完成时结束。第一个 token 产生前的 Decode 等待不计入 TPOT，之后的相邻 token 间隔才进入 TPOT。这一区别支持对尚未开始输出和已经开始输出的请求采用不同的准入与排序规则。

终测使用 20 组冻结测试，预赛的 22 组测试只提供反馈。题面以终测均分定义最终排名，Codeforces 榜单显示的累计分为 15247.457，折算的单组均分约为 762.373。本文沿用榜单的累计分显示值；比较不同规模的测试集时采用均分，并同时记录测试数量。[计分与测试集说明见官方题面](https://codeforces.com/contest/2251/problem/A)。

## 2 在线状态与整体框架

调度器维护四类状态：

- **请求状态**：到达时刻、输入长度、所属 Cloud、Prefill 进度、已产生 token 数、最近 token 时刻、是否完成、是否获准进入 Decode。
- **设备状态**：Edge 和每台 Cloud 的当前任务、成员、预计结束时刻，以及各阶段的就绪队列。
- **链路状态**：UP 与 DOWN 的 FIFO 队尾、已经入队的传输、预计完成时刻和携带的请求。
- **统计状态**：已完成 Prefill 的等待总量、已实现的 token 间隔、正在延长的等待、已完成请求的输出长度，以及各类资源的利用率。

就绪集合按阶段划分。Prefill 保留请求到达时刻；Decode 将已出过 token 的请求与尚未出过 token 的请求分开。安排任务后立即标记设备与成员为运行状态，任务或传输完成后再根据实际事件释放设备、推进请求。预计结束时刻用于规划、利用率估计与等待判断。

每个事件帧的决策顺序为：

1. 读完该帧全部事件，先识别完成请求。
2. 更新任务、传输、请求状态及在线统计。
3. 满足刷新条件时重新规划 Cloud 数量与目标批次。
4. 计算当前吞吐和等待价值，决定 Decode 准入。
5. 为每台空闲 Cloud 比较 Prefill 与 Decode 计算。
6. 为空闲 Edge 比较四类合法的 Edge 任务。
7. 若系统没有已知未来事件，检查是否需要强制推进。
8. 输出完整任务集合，并立即刷新输出缓冲。

同帧的完成通知可能与最后一次 D POST 的任务完成一起出现。应先识别完成请求，再计入最后一个 token、清理活跃状态，确保它不会进入下一轮 Decode。

## 3 容量与批次规划

### 3.1 配置空间

用 \(A\) 表示规划参与 Decode 的 Cloud 数量，\(b\) 表示每 Cloud 的目标批次，Edge 目标批次为 \(m=Ab\)。文中的 2000 是最终方案设置的规划与准入上限；官方题面允许任意非空的合法 Decode 批次，没有公布批次人数上限。

枚举 \(A=1,\ldots,K\)。每 Cloud 的批次从离散集合中选择：

\[
\begin{aligned}
\mathcal B=\{\, &1,2,3,4,6,8,12,16,24,32,\\
&48,64,96,128,192,256,384,512,\\
&768,1024,1536,2000\,\}.
\end{aligned}
\]

候选限制在 \(\lfloor2000/A\rfloor\) 以内，同时加入该上限并去重。最终方案在这个上限至少为 2 时跳过单成员的规划配置；实际释放批次仍然允许单成员任务。规划配置决定目标规模，当前就绪数量决定真实执行规模。

### 3.2 四类资源的周期

对一个配置 \((A,b)\)，计算

\[
C_E=d_{\mathrm{Dpre}}(m)+d_{\mathrm{Dpost}}(m),\qquad
C_C=d_{\mathrm{Dproc}}(b),
\]

\[
C_U=C_D=A\,T(b),\qquad
C=\max(C_E,C_C,C_U,C_D).
\]

\(C\) 近似代表稳态资源瓶颈周期。一次完整 Decode 路径的估计为

\[
H=d_{\mathrm{Dpre}}(m)+T(b)+d_{\mathrm{Dproc}}(b)
+T(b)+d_{\mathrm{Dpost}}(m).
\]

候选 TPOT 取 \(\max(H,C)\)。这样同时考虑请求自身的串行路径，以及共享资源对重复周期的限制。

### 3.3 吞吐校正与配置选择

仅用 \(m/C\) 会高估可达到的吞吐。先计算单成员配置的瓶颈周期 \(C_1\)，建立每 token 的基础成本

\[
q_0=\max\left(0,\frac{1}{\mathrm{TP}_{\mathrm{UB}}}-C_1\right),
\qquad
q=q_0+\frac{C}{m}.
\]

候选吞吐上限近似为 \(1/q\)。已有实测吞吐时，以当前配置成本 \(q_{\mathrm{cur}}\) 校正候选：

\[
\widehat{\mathrm{TP}}=
\min\left(\frac{1}{q},
\mathrm{TP}_{\mathrm{obs}}\frac{q_{\mathrm{cur}}}{q}\right).
\]

没有实测样本的启动阶段，对零到候选吞吐上限之间的可用吞吐采用均匀近似，用归一化吞吐收益的平均值评价配置：

\[
\overline F_{\mathrm{TP}}(q)=
\int_0^1
\operatorname{clip}\left(
\frac{u/q-\mathrm{TP}_{\mathrm{base}}}
{\mathrm{TP}_{\mathrm{UB}}-\mathrm{TP}_{\mathrm{base}}},
0,1\right)\,du.
\]

把候选吞吐收益与当前在线 TDR、候选 TPOT 对应的等待收益相加，选择加权分最高的配置。同分时优先较高吞吐；吞吐相近时优先较短 TPOT，再选择较小批次。

配置刷新同时满足两个条件：距上次规划至少 64 帧，在线 TDR 的变化量达到

\[
\max\left(0.05S_1,\ 0.10\max(1,|\mathrm{TDR}_{\mathrm{last}}|)\right).
\]

这使规划随负载变化调整，同时控制每帧的计算开销。

## 4 在线指标与动作价值

### 4.1 同时计入已完成与进行中的等待

只看已完成请求会低估正在积累的排队压力。在线 TDR 把完成样本和仍未完成 Prefill 的请求合并：

\[
\widehat{\mathrm{TDR}}=
\frac{\sum_{\text{已完成 Prefill}}(t_{\mathrm{Ppost}}-a_i)
+\sum_{\text{未完成 Prefill}}(t-a_i)}
{n_{\mathrm{已完成 Prefill}}+n_{\mathrm{未完成 Prefill}}}.
\]

在线 TPOT 则合并已经实现的相邻 token 间隔，以及已产生 token、尚未完成请求的当前等待：

\[
\widehat{\mathrm{TPOT}}=
\frac{\sum_{\text{已实现间隔}}\Delta t
+\sum_{\text{活跃输出请求}}(t-t_i^{\mathrm{last}})}
{n_{\mathrm{已实现间隔}}+n_{\mathrm{活跃输出请求}}}.
\]

分母为零时取零。吞吐估计使用已产生 token 数和从最早到达到最近 token 的时间跨度，与计分器使用的定义保持一致。

### 4.2 输出长度与最终样本数量

Prefill 的价值包含它将来支持的输出工作。总输出长度未知时，先以输入评分参数建立一个先验：

\[
L_0=
\operatorname{clip}\left(
\frac{\mathrm{TP}_{\mathrm{base}}S_1}
{1-\mathrm{TP}_{\mathrm{base}}S_2},
1,512\right).
\]

分母过小时取 32。随后保留一个先验样本，与已完成请求的输出长度合并：

\[
\widehat L=
\operatorname{clip}\left(
\frac{\sum_{\text{已完成请求}}L_{\mathrm{out}}+L_0}
{n_{\mathrm{已完成请求}}+1},
1,512\right).
\]

最终请求数量的估计使用已观察到达率乘以一个规划路径窗口，再加已到达数量。若距离最近到达的时间已经不小于路径长度、平均到达间隔与历史最大到达间隔中的最大值，则暂不增加预计到达量。

由请求数量估计 \(\widehat R\) 和输出长度估计，得到相邻间隔数量估计：

\[
\widehat G=
\max\left(
1,\ n_{\mathrm{已实现间隔}}+n_{\mathrm{活跃输出请求}},
\widehat R\max(0,\widehat L-1)
\right).
\]

这些估计仅用于比较动作，不修改交互器计算的真实指标。

### 4.3 等待和吞吐的价值系数

把在线 TDR 与 TPOT 代入超额等待公式，得到 \(e_1,e_2,D\)。当 \(D_{\mathrm{base}}>0\) 且 \(D>0\) 时，构造两个等待价值系数：

\[
p_{\mathrm{TDR}}=
\frac{w_{\mathrm{wait}}}{D_{\mathrm{base}}}
\frac{e_1}{D}\frac{1}{S_1\widehat R},
\qquad
p_{\mathrm{gap}}=
\frac{w_{\mathrm{wait}}}{D_{\mathrm{base}}}
\frac{e_2}{D}\frac{1}{S_2\widehat G}.
\]

它们近似表示推进一个请求的 Prefill 或缩短一个 token 间隔的收益。吞吐处于评分的线性区间时，使用

\[
p_{\mathrm{TP}}=
\frac{w_{\mathrm{TP}}}
{\mathrm{TP}_{\mathrm{UB}}-\mathrm{TP}_{\mathrm{base}}}
\frac{\mathrm{TP}}{M},
\]

其中 \(M\) 为已观测 token 输出跨度。各动作共同的计分乘子 1000 可以省略。

最终策略在等待价值为正且等待权重不低于吞吐权重时，暂停吞吐价值通道，集中处理等待压力。所有价值系数均为零时，以单位吞吐价值保持任务推进。评分的截断区间和零基准等待距离都需要明确处理，避免无效除法或失去推进方向。

## 5 候选动作的统一比较

### 5.1 动作收益与占用时间

Prefill 的 P PRE、P POST 对一个请求使用近似价值

\[
V_P=p_{\mathrm{TDR}}+\frac{\widehat L}{3}p_{\mathrm{TP}}.
\]

P PROC 的吞吐信用按本次推进的层比例 \(f\) 缩放：

\[
V_{\mathrm{Pproc}}=
p_{\mathrm{TDR}}+\frac{\widehat L}{3}f\,p_{\mathrm{TP}}.
\]

最终方案执行完整剩余的 P PROC 层区间。该框架保留层进度状态，但无需增加主动搜索切分点的步骤。

含 \(n\) 个成员的任一 Decode 阶段使用

\[
V_D=np_{\mathrm{gap}}+\frac n3p_{\mathrm{TP}}.
\]

Prefill 按价值除以该请求到 P POST 完成的剩余路径耗时比较；Decode 按价值除以本阶段的有效资源耗时比较。链路属于瓶颈时，D PRE 与 D PROC 的有效耗时加入相应传输工作。

每台空闲 Cloud 比较 P PROC 与 D PROC；空闲 Edge 比较 P PRE、P POST、D PRE 和 D POST。比值相同时，依次比较当前计算耗时、剩余 Prefill 路径和请求编号序列，使决策具有确定性。

### 5.2 链路排队对 Prefill 的影响

Decode 占用链路会延迟尚未经过该链路的 Prefill 请求。用 \(N_U\) 表示仍需经过 UP 的 Prefill 请求数，用 \(N_D\) 表示仍需经过 DOWN 的 Prefill 请求数。

D PRE 和 D PROC 的价值分别扣除

\[
\frac{N_U p_{\mathrm{TDR}}W_U}{\tau_U},
\qquad
\frac{N_D p_{\mathrm{TDR}}W_D}{\tau_D},
\]

其中 \(W_U,W_D\) 为本次传输工作，\(\tau_U,\tau_D\) 为对应动作的有效耗时。扣除项在相关链路被判定为瓶颈时启用。

这样，一个局部上更高效的 Decode 批次，也要承担它对 Prefill 排队造成的损失。普通调度只接受非负价值的动作；没有未来事件时由强制推进规则处理停滞。

## 6 Decode 准入与批次组织

### 6.1 控制活跃请求数量

P POST 完成后，请求先进入等待 Decode 准入的集合。此时 TDR 已结束，尚未形成相邻 token 间隔。准入决定何时把它加入持续运行的 Decode 请求队列。

当 token 间隔价值为正，或目标没有吞吐权重时，限制活跃数量。有吞吐权重的上限为

\[
N_{\max}=
\min\left(2000,\left\lceil\max(m,\mathrm{TP}S_2)\right\rceil\right).
\]

纯等待目标使用

\[
N_{\max}=
\min\left(2000,\left\lceil\max(1,\mathrm{TP}S_2)\right\rceil\right).
\]

其他情况允许等待集合中的请求进入 Decode。已经活跃的请求继续执行；上限收紧时停止新增准入，让现有请求自然完成。

准入依次优先补齐已活跃 Cloud 的未满目标批次，再使用已有活跃 Cloud，随后开启其他 Cloud。规划的 Cloud 数量用于引导分布，真实分布随当前请求情况调整。

### 6.2 优先维持已有 token 序列

已经产生 token 的请求按最近输出时刻排序；尚未产生 token 的请求按 P POST 完成时刻排序。组批先取已有输出请求，再补入首次输出请求。

跨 Cloud 的 D PRE 先考察各 Cloud 的就绪数量，在规划范围内选择较充足的 Cloud 队列，每个队列取目标数量，再用剩余成员补足。D PROC 保持同 Cloud 成员约束，D POST 可以在 Edge 上跨 Cloud 合并。

等待目标较重时，Cloud Decode 还倾向等待该 Cloud 的活跃队列重新聚齐，减少同一队列被拆成多个小批次造成的周期错位。强制推进时放开这一等待条件。

## 7 批次释放与资源拥塞

### 7.1 立即执行还是等待合批

若当前有 \(n\) 个就绪成员，目标批次为 \(b^\ast\)，先取 \(m=\min(n,b^\ast)\)。对下一次预计就绪事件，估计还能补入的成员数 \(x\) 和等待时间 \(\Delta\)。

合批可能节省一次调度开销 S。当前计算资源为瓶颈时，还计入

\[
C_s(m)+C_s(x)-C_s(m+x).
\]

相关链路为瓶颈时，再计入一次固定传输延迟；D PRE 涉及 Cloud 计算瓶颈时，还考虑后续 Cloud 合批带来的计算节省。将总节省记为 \(G\)，比较

\[
\text{合批收益}=p_{\mathrm{TP}}G,\qquad
\text{等待损失}=mp_{\mathrm{gap}}\Delta.
\]

等待损失超过收益时释放当前批次；等待时间已经不小于节省时间时也立即释放。没有可补入成员时，不继续等待凑批。

下一批成员的估计从已入队传输、正在运行的任务，以及已见请求的可推导后续阶段中得到。它用于规划等待窗口，不创造尚未到达的请求。

### 7.2 瓶颈识别与 Cloud 分配

瓶颈识别同时使用配置模型中的四类资源周期，以及在线指数平滑利用率。平滑时间尺度取当前周期的 8 倍，并设 50 ms 的下限。Cloud 利用率使用 K 台 Cloud 的平均值；利用率超过 5% 后，才参与运行期瓶颈判断。

分配新的 Prefill 请求时，比较各 Cloud 的待执行 Prefill 工作、活跃 Decode 的预计计算量和当前任务剩余时间。纯吞吐目标且固定链路延迟占主导时，对开启空闲的新 Cloud 加入额外成本，减少传输的碎片化。

UP 积压时，P PRE 需要考虑其上传结束后是否继续增加长队列；已有输出请求的间隔压力较高时，长 Prefill 传输受到额外限制。DOWN 饱和时，P PROC 也应检查完成后产生的回传是否会进一步堵塞链路。

### 7.3 停滞时的强制推进

允许短时等待的策略必须配套推进规则。若仍有未完成请求、当前没有安排任务，并且没有运行任务或已知传输会产生下一事件，则进入强制推进。

Edge 按 D POST、D PRE、P POST、P PRE 的顺序寻找合法任务；仍不能推进时，再寻找 Cloud 上的 D PROC 或 P PROC。该分支放开普通批次等待和部分拥塞保护，以当前真实就绪状态为依据。

## 8 独立复现的验证顺序

### 8.1 先验证交互与计分

先完成一个合法的最小调度器和独立交互模型，检查设备单任务约束、Cloud 固定分配、阶段前置条件、FIFO 入队顺序和请求完成清理。随后对照手工时间线验证插值、调度开销和传输公式。

一组可手算的输入为：一台 Cloud，调度开销 1 ms，链路固定延迟 2 ms，带宽 1 Gbps，每 token 数据 125000 字节，模型 4 层。一个请求在零时刻到达，输入长度为 4。Prefill 三阶段的计算耗时依次为 3、10、2 ms；Decode 三阶段依次为 1、4、1 ms。

由此得到输入传输耗时 6 ms、Decode 单成员传输耗时 3 ms。计入各阶段调度开销后，P POST 在 30 ms 完成，第一个 token 在 45 ms 产生。若请求输出两个 token，则第二个在 60 ms 产生。

取 \(S_1=30\)、\(S_2=15\)、吞吐上界 0.0625、吞吐基准 0.022222222、等待基准距离为零、两项权重各 0.5：

- 单 token 情况：吞吐量为 \(1/45\)，TDR 为 30，TPOT 为零，得分约 500.0000。
- 双 token 情况：吞吐量为 \(2/60\)，TDR 为 30，TPOT 为 15，得分约 637.9310。

这两种情况分别验证首 token 前等待、相邻 token 间隔与吞吐累计。使用给定精度的吞吐基准时，单 token 得分会有约百万分之几的数值偏差。

### 8.2 逐层加入策略

交互与计分正确后，按以下顺序加入调度机制：

1. 资源周期模型与批次规划。
2. 在线 TDR、TPOT、输出长度估计。
3. Prefill 与 Decode 的统一动作价值。
4. Decode 准入与两类输出队列。
5. 批次等待和链路排队代价。
6. 利用率识别、拥塞保护与强制推进。

每加入一层，都对同一组冻结场景与上一层做配对比较，检查得分、吞吐、TDR、TPOT、合法性和运行时间。首个决策分歧及其后续事件链可以解释收益或损失来自哪里。

边界测试覆盖单请求、单 token、多 Cloud 混合批次、同帧完成与任务结束、极低带宽、大固定延迟、请求集中到达、纯吞吐目标、纯等待目标，以及等待基准距离为零。非法输出或无事件停滞单独统计，不合并进正常性能波动。

### 8.3 固定输入并检验机器与负载变化

每组测试记录设备参数、六类耗时曲线、评分参数、请求到达时刻、输入长度、输出长度和随机种子。生成后冻结输入，同一对照使用同一批场景，避免生成变化混入策略变化。

验证集分别改变机器、请求形态和评分压力。特别需要保留原负载与原机器配对的测试，同时增加机器与负载重新配对的测试，检查某个机制的收益是否依赖特定组合。由少量基础模板扩展的测试存在相关性，误差估计应按模板聚类。

已有一次本地核验覆盖 344 个场景，全部合法；其中 22 组预赛重建测试累计分为 16395.013405，与预赛平台记录 16395.015 的微小差异来自重建参数及数值精度。这些结果可用于理解验证规模和精度要求。

## 9 最终方案的选择与验收

最终版本的选择同时考察预赛反馈、重新配对后的机器与负载、压力场景和合法性。预赛最高分候选在换机器后出现回退；进一步加入的前向模拟也没有形成稳定的净收益。最终采用统一边际价值调度框架，保留有验证支持的准入、合批和链路代价机制。

独立复现的验收分为三层。首先，交互合法且手算样例的事件时间与指标一致。其次，各模块按照上述价值、准入和释放规则工作，并能解释首个动作分歧。最后，在同一冻结输入上复跑，比较单组指标与累计得分；浮点比较可采用 \(10^{-9}\max(1,|x|)\) 的容差，离散状态与任务数量要求一致。

[官方终测榜单](https://codeforces.com/contest/2251/standings)记录的结果为**第 10 名、15247.457 分**。重新计算这一累计分需要相同的 20 组终测输入与计分参数。仅使用预赛重建或合成场景时，验收目标是独立实现的合法性、决策机制及对应测试集的结果。
