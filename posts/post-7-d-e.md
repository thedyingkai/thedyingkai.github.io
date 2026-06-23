---
title: ABC 404 D - E
description: AtCoder ABC 404 D-E 题解。
date: 2025.06.28
tags: [ABC, AtCoder, 题解]
---

# ABC 404 D - E

## D

### 思路

- 每种动物需要被访问两次，也就是同一个动物园访问至多两次之后就没有意义了，枚举每个动物园的访问次数 $\{0,1,2\}$，共 $3^{10}$ 种组合，可以过。
- 检查一下每个动物是否被看到至少两次，更新一下答案最小值就行了，还可以再顺便剪个枝，已经超过最小值后面就不用看了。

### AC code

```cpp
void solve(){
    int n, m;
    cin >> n >> m;
    vector<ll> c(n + 1);
    vector<vector<int>> a(m + 1, vector<int>(1));
    rep(i, 1, n) cin >> c[i];
    rep(i, 1, m) {
        int k;
        cin >> k;
        a[i].resize(k);
        rep(j, 0, k - 1) cin >> a[i][j];
    }
    ll ans = LLONG_MAX;
    vector<int> x(n + 1);
    auto dfs = [&](int i, ll sum, auto self) -> void {
        if (i > n) {
            rep(j, 1, m) {
                int cnt = 0;
                for (auto it : a[j]) cnt += x[it];
                if (cnt < 2) return;
            }
            ans = min(ans, sum);
        }
        for (auto it : {0, 1, 2}) {
            ll tem = sum + it * c[i];
            if (tem >= ans) continue;
            x[i] = it;
            self(i + 1, tem, self);
        }
    };
    dfs(1, 0, dfs);
    cout << ans << endl;
}
```

## E

### 思路

- 这道题可以不 DP，考虑贪心。
- 题目的意思很简单，对于一排 $N$ 个碗，每次操作都可以选择一个碗 $i$，把该碗的豆子自由分配到该碗和前面紧挨的 $c_i$ 个碗中，求把所有豆子移到最左边需要的最小操作次数。
- 对于 $a_i=0$ 的碗，即空碗，我们先不进行操作。而对于 $a_i \neq 0$ 的碗，每个碗至少要操作一次来移除其中的豆子，我们创建一个自定义的优先队列存储该碗豆子能分给的碗的区间左右端点，以右端点降序排列。
- 检查区间 $[l,r]$ 是否已经被部分覆盖，对于每个无法直接访问的区间，找到最优的碗进行操作，使区间覆盖范围最远，操作后标记该碗，并增加新的区间到优先队列中，重复上述过程直到所有区间都可以被访问。

> ~~说不是 DP，其实有 DP 的味道在的。~~
