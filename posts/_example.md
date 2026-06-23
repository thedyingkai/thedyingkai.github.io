---
title: 文章标题
description: 一句话简介，可省略；省略时构建器会自动从正文推断。
date: 2026.06.23
tags: [标签1, 标签2, 笔记]
---

# 文章标题

这里开始直接写正文。

## 支持 LaTeX

行内公式：$a^2+b^2=c^2$。

块级公式：

$$
F(x)=\sum_{n=0}^{\infty}a_nx^n
$$

## 支持代码块

```cpp
using i64 = long long;

i64 qp(i64 a, i64 b, i64 p){
    i64 res = 1;
    while(b){
        if(b & 1) res = res * a % p;
        a = a * a % p;
        b >>= 1;
    }
    return res;
}
```
