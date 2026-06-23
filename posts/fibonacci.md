# 斐波那契数列

定义如下：

$$
F\_n = 
\begin{cases}
1, & n \le 2,\newline
F\_{n-1} + F\_{n-2}, & n > 2.
\end{cases}
$$

## 性质

### 1. $F\_n = F\_{n-1} + F\_{n-2}$

### 2. $F\_n = \frac{1}{\sqrt{5}}\left(\frac{1 + \sqrt{5}}{2}\right)^n - \frac{1}{\sqrt{5}}\left(\frac{1 - \sqrt{5}}{2}\right)^n$

### 3. $F\_{m+n}=F\_m\,F\_{n+1}+F\_{m-1}\,F\_n.$

固定 $m$，对 $n$ 归纳。

$n=0$ 时：

$$
\text{左边 }F\_{m+0}=F\_m,\newline
\text{右边 }F\_mF\_1+F\_{m-1}F\_0=F\_m\cdot1+F\_{m-1}\cdot0=F\_m.
$$

假设对某个 $n\ge0$ 成立，即

$$
F\_{m+n}=F\_mF\_{n+1}+F\_{m-1}F\_n,\newline
F\_{m+n-1}=F\_mF\_{n}+F\_{m-1}F\_{n-1}.
$$

则

$$\begin{align\*}
F\_{m+(n+1)}
&=F\_{m+n}+F\_{m+n-1}\newline
&=\bigl(F\_mF\_{n+1}+F\_{m-1}F\_n\bigr)+\bigl(F\_mF\_{n}  +F\_{m-1}F\_{n-1}\bigr)\newline
&=F\_m\,(F\_{n+1}+F\_n)\;+\;F\_{m-1}\,(F\_n+F\_{n-1})\newline
&=F\_mF\_{n+2}+F\_{m-1}F\_{n+1},
\end{align\*}
$$

即对 $(n+1)$ 也成立。由此归纳得证。

### 4. $\sum \_{i=1}^n F\_i =F\_{n+2}-1$

$$
F\_i = F\_{i+2}-F\_{i+1},
$$

所以

$$
\begin{align\*}
\sum\_{i=1}^{n}F\_i
&=\sum\_{i=1}^{n}\bigl(F\_{i+2}-F\_{i+1}\bigr)\newline
&=(F\_3-F\_2)+(F\_4-F\_3)+\cdots+(F\_{n+2}-F\_{n+1})\newline
&=F\_{n+2}-F\_2\newline
&=F\_{n+2}-1.
\end{align\*}
$$

### 5. $\sum \_{i=1}^n F\_i^2 = F\_nF\_{n+1}$

有恒等式

$$
F\_{i+1}F\_i - F\_iF\_{i-1} = F\_i^2,
$$

因为右边

$$
\begin{align\*}
F\_{i+1}F\_i - F\_iF\_{i-1}
&=F\_i(F\_{i+1}-F\_{i-1}) \newline
&=F\_i(F\_i+F\_{i-1}-F\_{i-1}) \newline
&=F\_i^2.
\end{align\*}
$$

于是

$$
\begin{align\*}
\sum\_{i=1}^{n}F\_i^2
&=\sum\_{i=1}^{n}\bigl(F\_{i+1}F\_i - F\_iF\_{i-1}\bigr)\newline
&=(F\_2F\_1 - F\_1F\_0)+(F\_3F\_2 - F\_2F\_1)+\cdots+(F\_{n+1}F\_n - F\_nF\_{n-1})\newline
&=F\_{n+1}F\_n - F\_1F\_0\newline
&=F\_nF\_{n+1}.
\end{align\*}
$$

### 6. $\sum\_{i=1}^{n}F\_{2i}\;=\;F\_{2n+1}-1.$

$$
F\_{2i}=F\_{2i+1}-F\_{2i-1},
$$

于是

$$
\begin{align\*}
\sum\_{k=1}^{n}F\_{2k}
&=\sum\_{k=1}^{n}\bigl(F\_{2k+1}-F\_{2k-1}\bigr)\newline
&=(F\_3-F\_1)+\cdots+(F\_{2n+1}-F\_{2n-1})\newline
&=F\_{2n+1}-F\_1\newline
&=F\_{2n+1}-1.
\end{align\*}
$$

### 7. $\sum\_{i=1}^{n}F\_{2i-1}\;=\;F\_{2n}.$

### 8. $F\_n^2-F\_{n-1}F\_{n+1}=(-1)^{n+1}.$

### 9. $\operatorname{lcm}(F\_n,F\_m)=F\_{\operatorname{lcm}(n,m)}.$

## 第 $n$ 项的求法

### 1. 矩阵快速幂

已知

$$
\mathbf{v}\_n = \begin{pmatrix}F\_n\newline F\_{n-1}\end{pmatrix},F\_n = F\_{n-1} + F\_{n-2},
$$

写成矩阵形式

$$
\begin{pmatrix}
F\_n\newline F\_{n-1}
\end{pmatrix}
=\underbrace{
\begin{pmatrix}
1 & 1\newline 1 & 0
\end{pmatrix}
}\_{A}
\begin{pmatrix}
F\_{n-1}\newline F\_{n-2}
\end{pmatrix}
\Longrightarrow
\mathbf{v}\_n = A\,\mathbf{v}\_{n-1}.
$$

那么递推展开得

$$
\mathbf{v}\_n = A^{\,n-1}\,\mathbf{v}\_1,
\quad \mathbf{v}\_1=\begin{pmatrix}F\_1\newline F\_0\end{pmatrix}=\begin{pmatrix}1\newline 1\end{pmatrix}.
$$

于是第 $n$ 项

$$
F\_n = \bigl(A^{\,n-1}\begin{pmatrix}1\newline 1\end{pmatrix}\bigr)\_{1,1}.
$$

### 2. **Binet 公式（闭式解）**

$$
F\_n = \frac{\varphi^n - \psi^n}{\sqrt5},\quad 
\varphi = \frac{1+\sqrt5}2,\;\psi = \frac{1-\sqrt5}2.
$$

可能有精度误差。

### 3. **快速倍增（Fast Doubling）**

   $$
   \begin{aligned}
   F\_{2k}   &= F\_k\bigl(2\,F\_{k+1}-F\_k\bigr),\\
   F\_{2k+1} &= F\_{k+1}^2 + F\_k^2,
   \end{aligned}
   $$

可以在 $O(\log n)$ 内同时算出 $(F\_n,F\_{n+1})$。

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
F\_n &= \frac{1}{\sqrt5}\Biggl[\Bigl(\tfrac{1+\sqrt5}{2}\Bigr)^n - \Bigl(\tfrac{1-\sqrt5}{2}\Bigr)^n\Biggr].\newline
\end{align\*}
$$

卢卡斯数列通项公式：

$$
\begin{align\*}
L\_n &= \Bigl(\tfrac{1+\sqrt5}{2}\Bigr)^n + \Bigl(\tfrac{1-\sqrt5}{2}\Bigr)^n,\newline
\end{align\*}
$$

两者互推：

$$
F\_{n-1} + F\_{n+1} = L\_n,\newline
L\_{n-1} + L\_{n+1} = 5\,F\_n,\newline
F\_n\,L\_n = F\_{2n}.
$$

## 齐肯多夫定理

任何自然数 $n$ 可以被唯一地表示成一些斐波那契数的和：


$$N = F\_{k\_1} + F\_{k\_2} + \ldots + F\_{k\_r}$$

并且 $k\_1 \ge k\_2 + 2,\ k\_2 \ge k\_3 + 2,\  \ldots,\  k\_r \ge 2$（即不能使用两个相邻的斐波那契数）

于是我们可以用 $d\_0 d\_1 d\_2 \dots d\_s 1 的编码表示一个正整数，其中 
d\_i=1$ 则表示 $F\_{i+2}$ 被使用。编码末位我们强制给它加一个 $1$（这样会出现两个相邻的 $1$），表示这一串编码结束。

给 $n$ 编码的过程可以使用贪心算法解决：

<br>

1. 从大到小枚举斐波那契数 $F\_i$，直到 $F\_i\le n$。
2. 把 $n$ 减掉 $F\_i$，在编码的 $i-2$ 的位置上放一个 $1$（编码从左到右以 $0$ 为起点）。
3. 如果 $n$ 为正，回到步骤 $1$。
4. 最后在编码末位添加一个 $1$，表示编码的结束位置。

<br>

解码过程同理，先删掉末位的 $1$，对于编码为 $1$ 的位置 $i$（编码从左到右以 $0$ 为起点），累加一个 $F\_{i+2}$ 到答案。最后的答案就是原数字。