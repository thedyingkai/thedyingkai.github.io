---
title: 斐波那契数列
description: 斐波那契性质、快速倍增、卢卡斯数列与齐肯多夫定理。
date: 2025.07.31
tags: [数学, 数论, 笔记]
---

# 斐波那契数列

定义如下：

$$
F_n = 
\begin{cases}
1, & n \le 2,\newline
F_{n-1} + F_{n-2}, & n > 2.
\end{cases}
$$

## 性质

### 1. $F_n = F_{n-1} + F_{n-2}$

### 2. $F_n = \frac{1}{\sqrt{5}}\left(\frac{1 + \sqrt{5}}{2}\right)^n - \frac{1}{\sqrt{5}}\left(\frac{1 - \sqrt{5}}{2}\right)^n$

### 3. $F_{m+n}=F_m\,F_{n+1}+F_{m-1}\,F_n.$

固定 $m$，对 $n$ 归纳。

$n=0$ 时：

$$
\text{左边 }F_{m+0}=F_m,\newline
\text{右边 }F_mF_1+F_{m-1}F_0=F_m\cdot1+F_{m-1}\cdot0=F_m.
$$

假设对某个 $n\ge0$ 成立，即

$$
F_{m+n}=F_mF_{n+1}+F_{m-1}F_n,\newline
F_{m+n-1}=F_mF_{n}+F_{m-1}F_{n-1}.
$$

则

$$\begin{align\*}
F_{m+(n+1)}
&=F_{m+n}+F_{m+n-1}\newline
&=\bigl(F_mF_{n+1}+F_{m-1}F_n\bigr)+\bigl(F_mF_{n}  +F_{m-1}F_{n-1}\bigr)\newline
&=F_m\,(F_{n+1}+F_n)\;+\;F_{m-1}\,(F_n+F_{n-1})\newline
&=F_mF_{n+2}+F_{m-1}F_{n+1},
\end{align\*}
$$

即对 $(n+1)$ 也成立。由此归纳得证。

### 4. $\sum _{i=1}^n F_i =F_{n+2}-1$

$$
F_i = F_{i+2}-F_{i+1},
$$

所以

$$
\begin{align\*}
\sum_{i=1}^{n}F_i
&=\sum_{i=1}^{n}\bigl(F_{i+2}-F_{i+1}\bigr)\newline
&=(F_3-F_2)+(F_4-F_3)+\cdots+(F_{n+2}-F_{n+1})\newline
&=F_{n+2}-F_2\newline
&=F_{n+2}-1.
\end{align\*}
$$

### 5. $\sum _{i=1}^n F_i^2 = F_nF_{n+1}$

有恒等式

$$
F_{i+1}F_i - F_iF_{i-1} = F_i^2,
$$

因为右边

$$
\begin{align\*}
F_{i+1}F_i - F_iF_{i-1}
&=F_i(F_{i+1}-F_{i-1}) \newline
&=F_i(F_i+F_{i-1}-F_{i-1}) \newline
&=F_i^2.
\end{align\*}
$$

于是

$$
\begin{align\*}
\sum_{i=1}^{n}F_i^2
&=\sum_{i=1}^{n}\bigl(F_{i+1}F_i - F_iF_{i-1}\bigr)\newline
&=(F_2F_1 - F_1F_0)+(F_3F_2 - F_2F_1)+\cdots+(F_{n+1}F_n - F_nF_{n-1})\newline
&=F_{n+1}F_n - F_1F_0\newline
&=F_nF_{n+1}.
\end{align\*}
$$

### 6. $\sum_{i=1}^{n}F_{2i}\;=\;F_{2n+1}-1.$

$$
F_{2i}=F_{2i+1}-F_{2i-1},
$$

于是

$$
\begin{align\*}
\sum_{k=1}^{n}F_{2k}
&=\sum_{k=1}^{n}\bigl(F_{2k+1}-F_{2k-1}\bigr)\newline
&=(F_3-F_1)+\cdots+(F_{2n+1}-F_{2n-1})\newline
&=F_{2n+1}-F_1\newline
&=F_{2n+1}-1.
\end{align\*}
$$

### 7. $\sum_{i=1}^{n}F_{2i-1}\;=\;F_{2n}.$

### 8. $F_n^2-F_{n-1}F_{n+1}=(-1)^{n+1}.$

### 9. $\operatorname{lcm}(F_n,F_m)=F_{\operatorname{lcm}(n,m)}.$

## 第 $n$ 项的求法

### 1. 矩阵快速幂

已知

$$
\mathbf{v}_n = \begin{pmatrix}F_n\newline F_{n-1}\end{pmatrix},F_n = F_{n-1} + F_{n-2},
$$

写成矩阵形式

$$
\begin{pmatrix}
F_n\newline F_{n-1}
\end{pmatrix}
=\underbrace{
\begin{pmatrix}
1 & 1\newline 1 & 0
\end{pmatrix}
}_{A}
\begin{pmatrix}
F_{n-1}\newline F_{n-2}
\end{pmatrix}
\Longrightarrow
\mathbf{v}_n = A\,\mathbf{v}_{n-1}.
$$

那么递推展开得

$$
\mathbf{v}_n = A^{\,n-1}\,\mathbf{v}_1,
\quad \mathbf{v}_1=\begin{pmatrix}F_1\newline F_0\end{pmatrix}=\begin{pmatrix}1\newline 1\end{pmatrix}.
$$

于是第 $n$ 项

$$
F_n = \bigl(A^{\,n-1}\begin{pmatrix}1\newline 1\end{pmatrix}\bigr)_{1,1}.
$$

### 2. **Binet 公式（闭式解）**

$$
F_n = \frac{\varphi^n - \psi^n}{\sqrt5},\quad 
\varphi = \frac{1+\sqrt5}2,\;\psi = \frac{1-\sqrt5}2.
$$

可能有精度误差。

### 3. **快速倍增（Fast Doubling）**

   $$
   \begin{aligned}
   F_{2k}   &= F_k\bigl(2\,F_{k+1}-F_k\bigr),\\
   F_{2k+1} &= F_{k+1}^2 + F_k^2,
   \end{aligned}
   $$

可以在 $O(\log n)$ 内同时算出 $(F_n,F_{n+1})$。

```cpp
using i64=long long;
pair<i64,i64> fib(i64 n){
  if(n==0) return {0,1};
  auto &[x,y]=fib(n>>1);
  i64 c=x*(2*y-x);
  i64 d=x*x+y*y;
  if(n&1) return {d,c+d};
  else return {c,d};
}
```

## 和卢卡斯数列的关系

斐波那契数列通项公式：

$$
\begin{align\*}
F_n &= \frac{1}{\sqrt5}\Biggl[\Bigl(\tfrac{1+\sqrt5}{2}\Bigr)^n - \Bigl(\tfrac{1-\sqrt5}{2}\Bigr)^n\Biggr].\newline
\end{align\*}
$$

卢卡斯数列通项公式：

$$
\begin{align\*}
L_n &= \Bigl(\tfrac{1+\sqrt5}{2}\Bigr)^n + \Bigl(\tfrac{1-\sqrt5}{2}\Bigr)^n,\newline
\end{align\*}
$$

两者互推：

$$
F_{n-1} + F_{n+1} = L_n,\newline
L_{n-1} + L_{n+1} = 5\,F_n,\newline
F_n\,L_n = F_{2n}.
$$

## 齐肯多夫定理

任何自然数 $n$ 可以被唯一地表示成一些斐波那契数的和：


$$N = F_{k_1} + F_{k_2} + \ldots + F_{k_r}$$

并且 $k_1 \ge k_2 + 2,\ k_2 \ge k_3 + 2,\  \ldots,\  k_r \ge 2$（即不能使用两个相邻的斐波那契数）

于是我们可以用 $d_0 d_1 d_2 \dots d_s 1 的编码表示一个正整数，其中 
d_i=1$ 则表示 $F_{i+2}$ 被使用。编码末位我们强制给它加一个 $1$（这样会出现两个相邻的 $1$），表示这一串编码结束。

给 $n$ 编码的过程可以使用贪心算法解决：

<br>

1. 从大到小枚举斐波那契数 $F_i$，直到 $F_i\le n$。
2. 把 $n$ 减掉 $F_i$，在编码的 $i-2$ 的位置上放一个 $1$（编码从左到右以 $0$ 为起点）。
3. 如果 $n$ 为正，回到步骤 $1$。
4. 最后在编码末位添加一个 $1$，表示编码的结束位置。

<br>

解码过程同理，先删掉末位的 $1$，对于编码为 $1$ 的位置 $i$（编码从左到右以 $0$ 为起点），累加一个 $F_{i+2}$ 到答案。最后的答案就是原数字。
