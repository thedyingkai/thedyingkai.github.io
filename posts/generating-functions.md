## 普通生成函数

### 一般形式

$$F(x)=\sum\_{n=0}^{\infty}a\_n x^n$$

其中，$a\_n$ 既可以是有穷序列又可以是无穷序列。

$F(x)\pm G(x)$ 是序列 $\langle a\_n\pm b\_n\rangle$ 的普通生成函数，$F(x)G(x)$ 是序列 $\langle\sum\_{i=0}^na\_nb\_{n-i}\rangle$ 的普通生成函数。

生成函数的乘法称为卷积。

### 普通生成函数可以解决多重集组合数问题

设从每种物品中取 $b\_i$ 个，$0 \le b\_i \le a\_i$，且 $m = \sum\_{i=1}^n b\_i$，对于给定的一组 $\{b\_i\}$，将各物品放入序列中的排列看作一种方案（方案数为 1）。

那么，所有满足

$$
b\_1 + b\_2 + \cdots + b\_n = m
$$

的排列方案总数，就是我们要求的答案。

构造普通生成函数：

* 第 1 种物品的生成函数为

  $$
    1 + x^1 + x^2 + \cdots + x^{a\_1},
  $$
* 第 n 种物品的生成函数为

  $$
    1 + x^1 + x^2 + \cdots + x^{a\_n}.
  $$

于是所有物品的联合生成函数为所有生成函数的卷积：

$$
(1 + x + x^2 + \cdots + x^{a\_1})\,(1 + x + x^2 + \cdots + x^{a\_2})\;\cdots\;(1 + x + x^2 + \cdots + x^{a\_n}),
$$

我们只需取其中 $x^m$ 项的系数即可得到上述多重集组合数。

> **注意**：
>
> * 幂指数代表取出的物品总数；
> * 系数就是对应的组合方案数。


## 指数生成函数

### 一般形式

$$F(x)=\sum\_{n=0}^{\infty}a\_n\frac{x^n}{n!}$$

$F(x)\pm G(x)$ 是序列 $\langle a\_n\pm b\_n\rangle$ 的指数生成函数，$F(x)G(x)$ 是序列 $\langle\sum\_{i=0}^n\binom{n}{i}a\_nb\_{n-i}\rangle$ 的指数生成函数。

* 序列 $\langle1,1,1,\dots\rangle$ 的指数生成函数为

  $$
  1+\frac{x}{1!}+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots
  =\sum\_{n\ge0}\frac{x^n}{n!}
  =e^x.
  $$

* 序列 $\langle1,p,p^2,\dots\rangle$ 的指数生成函数为

  $$
  1+p\frac{x}{1!}+p^2\frac{x^2}{2!}+p^3\frac{x^3}{3!}+\cdots
  =\sum\_{n\ge0}p^n\frac{x^n}{n!}
  =e^{px}.
  $$

### 指数生成函数可以解决多重集排列数问题

设从第 $i$ 种物品中取 $b\_i$ 个，且

$$
0 \le b\_i \le a\_i,\qquad
m = \sum\_{i=1}^n b\_i.
$$

对于一组 $\{b\_i\}$，如果直接把这 $m$ 个“区分开”的物品排列，显然有 $m!$ 种方法；但其中同类物品不可区分，需要除以每种物品内部的重复排列数，故该组方案的排列数为

$$
\frac{m!}{b\_1!\,b\_2!\,\cdots\,b\_n!}.
$$

于是，**所有** 满足
$\;b\_1+b\_2+\cdots+b\_n=m\;$
的排列数之和，就是多重集排列数的答案。

第 $i$ 种物品的指数生成函数是

$$
1 \;+\;\frac{x^1}{1!}\;+\;\frac{x^2}{2!}\;+\;\cdots+\;\frac{x^{a\_i}}{a\_i!}.
$$

相乘，展开后，任意一项

$$
\frac{x^{b\_1}}{b\_1!}\;\times\;\frac{x^{b\_2}}{b\_2!}\;\times\cdots\times\;\frac{x^{b\_n}}{b\_n!}
= \frac{x^m}{b\_1!\,b\_2!\,\cdots\,b\_n!}
$$

恰对应一种 $\{b\_i\}$ 的选择。合并所有 $b\_1+\cdots+b\_n=m$ 的情况，得到

$$
\sum\_{b\_1+\cdots+b\_n=m}\frac{x^m}{b\_1!\cdots b\_n!}
= \Bigl(\sum\_{b\_1+\cdots+b\_n=m}\frac{1}{b\_1!\cdots b\_n!}\Bigr)\frac{x^m}{m!}\,m!.
$$

因此，这个乘积中 $\dfrac{x^m}{m!}$ 项的系数正好是
$$
\frac{m!}{b\_1!\cdots b\_n!}
$$

## 函数和生成函数互相转化

### 普通生成函数（OGF）

$$
\begin{aligned}
1.\quad &\frac{1}{1 - x^k}
       = \sum\_{n=0}^\infty x^{k n}, \newline
2.\quad &(1 - x)^{-m}
       = \sum\_{n=0}^\infty \binom{n + m - 1}{m - 1}\,x^n.
\end{aligned}
$$

* 当 $k=1$ 恢复几何级数；
* 第二条是二项式定理推广（负整数幂）。

### 指数生成函数（EGF）

$$
\begin{aligned}
3.\quad &ae^{bx}
       = \sum\_{n=0}^\infty(ab^n)\frac{x^n}{n!}, \newline
4.\quad &\cosh x
       = \frac{e^x + e^{-x}}{2}
       = \sum\_{n=0}^\infty \frac{x^{2n}}{(2n)!}, \newline
5.\quad &\sinh x
       = \frac{e^x - e^{-x}}{2}
       = \sum\_{n=0}^\infty \frac{x^{2n+1}}{(2n+1)!}.
\end{aligned}
$$

* 第三条是指数函数；
* 第四五条分别给出双曲余弦和双曲正弦的展开。

## 狄利克雷生成函数

### 一般形式

$$F(x)=\sum\_{n=1}^\infty \frac{a\_n}{n^x}$$

乘法运算：
$$\sum\_{i=1}^\infty \frac{a\_i}{i^x}\sum\_{j=1}^\infty \frac{b\_j}{j^x}=\sum\_{n=1}^\infty \frac{1}{n^x}\sum\_{d|n}a\_d\cdot b\_{\frac{n}{d}}$$

$\sum\_{d|n}a\_d\cdot b\_{\frac{n}{d}}$ 就是在枚举 $n$ 的约数，每一项是 $a\_i$ 升序和 $b\_j$ 降序的乘积之和。

## 积性函数

$f(n)$ 是积性函数，当且仅当 $f(1)=1$ 且 $f(ab)=f(a)f(b)$。欧拉函数和莫比乌斯函数都是积性函数。

### 欧拉函数

$$\phi(n)=\sum\_{i=1}^n[\gcd(i,n)=1]$$

性质：$\sum\_{d|n}\phi(d)=n$

### 莫比乌斯函数

$$
\mu(n)=
\begin{cases}
1, & n = 1,\newline
0, & n \text{ 含有平方因子},\newline
(-1)^{k}, & k \text{ 为 } n \text{ 的本质不同质因子个数}.
\end{cases}
$$

性质：
1. $\sum\_{d|n}\mu(d)=0$
2. $\sum\_{d|n}\mu(d)\frac{n}{d}=\phi(n)$


## 狄利克雷卷积

### 定义：

$f(n),g(n)$ 是两个积性函数，则

$$
(f*g)(n)=\sum\_{d|n}f(d)g(\frac{n}{d})=\sum\_{d|n}f(\frac{n}{d})g(d)
$$

其中，$(f*g)(n)$ 读作 $f$ 卷积 $g$。

### 性质：

1. 交换律：$f\*g=g\*f$
2. 结合律：$(f\*g)\*h=f\*(g\*h)$
3. 分配律：$(f+g)\*h=f\*h+g\*h$

### 常用函数

1. 元函数：$\epsilon(n)=[n=1],$
2. 常数函数：$1(n)=1,$
3. 恒等函数：$id(n)=n.$

### 常用卷积关系

#### 1. $\sum\_{d|n} \mu(d) = [n = 1] \iff \mu * 1 = \varepsilon$

证明：$(\mu * 1)(n) = \sum\_{d|n} \mu(d) \cdot 1\left( \frac{n}{d} \right) = \sum\_{d|n} \mu(d) = [n=1] = \varepsilon(n)$

#### 2. $\sum\_{d|n} \varphi(d) = n \iff \varphi * 1 = \mathrm{id}$

证明：$(\varphi * 1)(n) = \sum\_{d|n} \varphi(d) \cdot 1\left( \frac{n}{d} \right) = \sum\_{d|n} \varphi(d) = n = \mathrm{id}(n)$

#### 3. $\sum\_{d|n} \mu(d) \frac{n}{d} = \varphi(n) \iff \mu * \mathrm{id} = \varphi$

证明：$(\mu * \mathrm{id})(n) = \sum\_{d|n} \mu(d) \cdot \mathrm{id\left( \frac{n}{d} \right)} = \sum\_{d|n} \mu(d) \cdot \frac{n}{d} = \varphi(n)$

#### 4. $f * \varepsilon = f$

证明：$(f * \varepsilon)(n) = \sum\_{d|n} f(d) \cdot \varepsilon\left( \frac{n}{d} \right) = \sum\_{d|n} f(d) \cdot \left[ \frac{n}{d} = 1 \right] = f(n)$

#### 5. $f * 1 \neq f$

证明：$(f * 1)(n) = \sum\_{d|n} f(d) \cdot 1\left( \frac{n}{d} \right) = \sum\_{d|n} f(d)$
