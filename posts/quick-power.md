---
title: 快速幂杂谈
description: 普通快速幂、逆元、矩阵快速幂、高精度快速幂和群论视角。
date: 2025.07.31
tags: [快速幂, 数学, 数论, 笔记]
---

## 普通快速幂

最基础的快速幂直接贴板子，推导过程我不太感兴趣。

```cpp
using i64 = long long;

i64 qp(i64 a, i64 b, i64 p) {
    i64 res = 1;
    while (b > 0) {
        if (b & 1) res = res * a % p;
        a = a * a % p;
        b >>= 1;
    }
    return res % p;
}
```
