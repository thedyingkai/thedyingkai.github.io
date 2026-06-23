---
title: Codeforces-1034-Div.3 题解 E-G
description: Codeforces Round 1034 Div.3 E-G 题解。
date: 2025.07.03
tags: [Codeforces, Div3, 题解]
---

# Codeforces-1034-Div.3 题解 E-G

## E

### 思路

- 不难观察到，能改变整个数组的 $\mathrm{MEX}$ 的只有改变从 $0$ 开始的连续一组数，想把 $\mathrm{MEX}$ 改变为 $i$，最少需要把所有的 $i$ 全删除，最多删除除了 $0$ 到 $i-1$ 以外的 $n-i$ 个数。
- 构造一个差分数组，把每个数可以成为 $\mathrm{MEX}$ 的删除元素个数区间累计，统计从 $a$ 中恰好移除 $k$ 个元素后 $\mathrm{MEX}$ 可能取值的数目时还原数组直接输出就行了。

### AC Code

```cpp
void LuoTianyi(){
    int n;
    cin >> n;
    vector<int> a(n + 1);
    map<int, int> mp;
    rep(i, 1, n) {
        cin >> a[i];
        mp[a[i]]++;
    }

    vector<int> diff(n + 2);
    rep(i, 0, n) {
        int L = mp[i];
        int R = n - i;
        if (L <= R) {
            diff[L]++;
            diff[R + 1]--;
        }
        if (mp[i] == 0) break;
    }

    vector<int> ans(n + 1);
    ans[0] = diff[0];
    rep(i, 1, n) ans[i] = ans[i - 1] + diff[i];

    rep(i, 0, n) cout << ans[i] << ' ';
    ENDL;
}
```

## F

### 思路

- 结论 1：$1$ 和 $i$（$i>\frac{n}{2}$ 并且 $i$ 为素数）一定是不可动点。
- 证明 1：对于小于 $\frac{n}{2}$ 的素数 $i$，必有 $2 \times i$，使得 $\gcd(i,2i) \neq 1$。
- 对于其余数字，都至少有一个对应的数与其不互质，我们考虑把这些数按照最大素因数分组，在每组组内向后错开一位，易得构造出的解为正解。
- 为什么不按照最小素因子，拿 $2$、$5$、$10$ 举例，不难发现先处理 $2$ 的倍数会把 $10$ 处理掉，但到了 $5$ 就没有 $5$ 的倍数处理 $5$ 了。换言之，就是含更大素数的数字数量更少，而 $2$ 无论如何都有数与之配对。

### AC Code

```cpp
struct Prime{
    vector<bool> is_prime;
    vector<i64> primes;
    void sieve(int n){
        is_prime.assign(n + 1, 1);
        is_prime[0] = is_prime[1] = 0;
        for (int i = 2; i <= n; i++) {
            if (is_prime[i]) primes.push_back(i);
            for (int j = 0; j < primes.size() && i * primes[j] <= n; j++) {
                is_prime[i * primes[j]] = 0;
                if (i % primes[j] == 0) break;
            }
        }
    }
};
Prime prime;

void PRE(){
    prime.sieve(1e5 + 5);
}
```

## G

### 思路

- 观察操作 2，我们不难得到该赋值操作只可以得到 $[0,m)$ 的数字，由于我们需要查询整个区间是否在修改后单调非递减，单点修改区间查询，不难想到去差分。
- 把 $k$ 连续加若干次，等价于每次把元素加上 $\gcd(k,m)$。
- 要把数组变的非递减，其实只关心每个相邻位置之间，能否把 $a_i$ 变大，使 $a_{i-1}\leq a_i$，保证每次只增加 $\gcd(k,m)$ 的整数倍。但是我们又注意到，不管怎么增大，$a_i<m$ 恒成立，故总的增量严格小于 $m$。
- 那如何记录增量，我们注意到，尽管 $m$ 很大，但是 $m$ 的因数即 $\gcd(k,m)$ 可能的取值其实非常少，那我们可以直接拆解因数，枚举 $\gcd(k,m)$，在每次单点修改操作时修改所有 $\gcd(k,m)$ 可能取值的总增量，和差分数组一起维护就可以了。
