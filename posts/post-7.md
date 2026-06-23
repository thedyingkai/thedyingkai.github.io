---
title: ABC 404 A - E
description: AtCoder ABC 404 A-E 题解。
date: 2025.06.28
tags: [ABC, AtCoder, 题解]
---

# ABC 404

## A

### 思路

- 纯签到，但是因为平时 vector<bool> 不需要初始化， bool[] 忘初始化 wa 了 $1$ 发。

### AC code

```cpp
void solve(){
    string s;
    cin >> s;
    bool vis[27] = {0};
    rep(i, 0, s.length() - 1) vis[s[i] - 'a'] = 1;
    rep(i, 0, 25) if (!vis[i]) {
        cout << (char)(i + 'a');
        return;
    }
}
```

## B

### 思路

- 数据范围很小，直接暴力模拟。

### AC code

```cpp
void solve(){
    int n;
    cin >> n;
    vector<string> s(n), t(n);
    rep(i, 0, n - 1) cin >> s[i];
    rep(i, 0, n - 1) cin >> t[i];
    ll ans = LLONG_MAX;
    rep(i, 0, 3){
        if (i != 0) {
            vector<string> tem(n, string(n, ' '));
            rep(ii, 0, n - 1) rep(jj, 0, n - 1) tem[jj][n - 1 - ii] = s[ii][jj];
            s.swap(tem);
        }
        ll cnt = 0;
        rep(ii, 0, n - 1) rep(jj, 0, n - 1) if (s[ii][jj] != t[ii][jj]) cnt++;
        ans = min(ans, i + cnt);
    }
    cout << ans;
}
```

## C

### 思路

如果一个简单无向图有 $N$ 个顶点，$M$ 条边，想形成一张环图，每个顶点的度必须严格等于 $2$，并且 $N=M$。

> 因为环上的每一个点连接且仅连接两个点，并和这两个点分别共享一条边，即每 $1$ 个点分得 $1 \div 2 \times 2 = 1$ 条边。

因此，我们在存图时存入每个顶点的度数，若该图是环图，只要该点存在（$d_i \neq 0$）,该点的度数只能是 $2$。
