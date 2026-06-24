---
title: Codeforces-1034-Div.3 题解
description: Codeforces Round 1034 Div.3 A-G 题解。
date: 2025.07.03
tags: [Codeforces, Div3, 题解]
---

# Codeforces-1034-Div.3 题解

## A

### 思路

- 我们发现 Bob 赢的条件更为苛刻，需要选择特定要求的数字，而 Alice 则有数字就行，考虑从 Bob 入手。
- Bob 想赢，首先要满足 $n$ 为奇数，其次 $n-1$ 个数均满足配对要求，整理一下就是 $[1]_4$ 和 $[2]_4$， $[0]_4$ 和 $[3]_4$ 分别两两配对的情况下，余下的元素个数不大于 $1$。

### AC Code

```cpp
void LuoTianyi(){
    int n;
    cin>>n;
    vector<int> a(n+1);
    map<int,int> mp;

    _rep(i,0,n) mp[i%4]++;

    if(abs(mp[0]-mp[3])+abs(mp[1]-mp[2])<1) cout<<"Bob"<<endl;
    else cout<<"Alice"<<endl;
}
```

## B

### 思路

- 注意到，选手 $j$ 有入围的可能即可，对于大于 $a_j$ 的选手，我直接黑幕让他们自相残杀就行，只要 $k>1$ 他就是有机会的。
- 对于 $k=1$ 的情况，只有 $j$ 选手最强才能赢。

### AC Code

```cpp
void LuoTianyi(){
    int n,j,k;
    cin>>n>>j>>k;
    vector<int> a(n+1);
    rep(i,1,n){
        cin>>a[i];
    }
    if(a[j]==MAX(a)||k>1) Yes;
    else No;
}
```

## C

### 思路

> ~~赛时就是 guess 的~~

- 拿前缀先来看，我如果想保住第 $i$ 个数，他必须是前 $i$ 个数中的最小值，否则他必定被更小的数换下去；后缀同理。
- 想保住第 $i$ 个数的话，只要他符合上面的要求，前面的数就都可以删掉，我们再看后面的，经过若干次操作，总能得到一个数，这个数小于 $a_i$ 就选择后缀操作，反之就选择前缀操作，我们就证明了上面的条件一定得到答案。
- 即，维护一个前缀最小值和一个后缀最大值数组，只要 $a_i$ 是其中一个就输出 $1$，否则 $0$。

### AC Code

```cpp
void LuoTianyi(){
    int n;
    cin>>n;
    vector<int> a(n+1);
    rep(i,1,n) cin>>a[i];
    vector<int> pre(n+1),suf(n+1);
    string s(n,'0');

    pre[1]=a[1];
    rep(i,2,n) pre[i]=min(pre[i-1],a[i]);
    suf[n]=a[n];
    dep(i,n-1,1) suf[i]=max(suf[i+1],a[i]);

    rep(i,1,n){
        if(pre[i]==a[i]||suf[i]==a[i]) cout<<1;
        else cout<<0;
    }

    ENDL;
}
```

## D

### 思路

- 先考虑较为边界的特判，Alice 先手，如果她可以一次性清空，直接获胜。
- 如果 Alice 未一次性得胜，设分数为字符串中 $1$ 的数量，我们容易得知，Alice 每次操作会把分数 $-4$，而 Bob 只有在得到 $k$ 个连续的 $0$ 时才能让分数 $+4$，从而阻止 Alice 获胜，于是问题转化为何种情况 Bob 能得到 $k$ 个连续的 $0$。
- $k\leq \lfloor \frac{n}{2} \rfloor$ 时，我们把字符串分为两段，前 $k$、后  $n-k$，Alice 第一次操作未能全部清空 $1$，若前段无 $1$，Bob 在前段操作得到 $k$ 个连续的 $0$，反之，在后段操作，由上面的结论得出 Bob 胜。
- $k>\lfloor \frac{n}{2} \rfloor$ 时，后 $k$ 个元素构成的段与前 $k$ 个元素构成的段有交接处，这意味着 Alice 可以补满前段，把剩余补后段末尾，则 Bob 必然得不到 $k$ 个连续的 $0$。

### AC Code

```cpp
void LuoTianyi(){
    int n,k;
    cin>>n>>k;
    string s;
    cin>>s;
    s=' '+s;
    int cnt1=0;
    rep(i,1,n) cnt1+=(s[i]=='1');
    
    if(cnt1<=k) cout<<"Alice"<<endl;
    else if(k>n/2) cout<<"Alice"<<endl;
    else cout<<"Bob"<<endl;
}
```

## E

### 思路

- 不难观察到，能改变整个数组的 $\mathrm{MEX}$ 的只有改变从 $0$ 开始的连续一组数，想把 $\mathrm{MEX}$ 改变为 $i$，最少需要把所有的 $i$ 全删除，最多删除除了 $0$ 到 $i-1$ 以外的 $n-i$ 个数。
- 构造一个差分数组，把每个数可以成为 $\mathrm{MEX}$ 的删除元素个数区间累计，统计从 $a$ 中恰好移除 $k$ 个元素后 $\mathrm{MEX}$ 可能取值的数目时还原数组直接输出就行了。

### AC Code

```cpp
void LuoTianyi(){
    int n;
    cin>>n;
    vector<int> a(n+1);
    map<int,int> mp;
    rep(i,1,n){
        cin>>a[i];
        mp[a[i]]++;
    }

    vector<int> diff(n+2);
    rep(i,0,n){
        int L=mp[i];
        int R=n-i;
        if(L<=R){
            diff[L]++;
            diff[R+1]--;
        }
        if(mp[i]==0) break;
    }

    vector<int> ans(n+1);
    ans[0]=diff[0];
    rep(i,1,n) ans[i]=ans[i-1]+diff[i];

    rep(i,0,n) cout<<ans[i]<<' ';
    ENDL;
}
```

## F

### 思路

- 结论 1：$1$ 和 $i$（$i>\frac{n}{2}$ 并且 $i$ 为素数）一定是不可动点。
- 证明 1：对于小于 $\frac{n}{2}$ 的素数 $i$，必有 $2 \times i$，使得 $\gcd(i,2i) \neq 1$。
- 对于其余数字，都至少有一个对应的数与其不互质，我们考虑把这些数按照最大素因数分组，在每组组内向后错开一位，易得构造出的解为正解。
- 为什么不按照最小素因子，拿 $2$、$5$、$10$ 举例，不难发现先处理 $2$ 的倍数会把 $10$ 处理掉，但到了 $5$ 就没有 $5$ 的倍数处理 $5$ 了。换言之，就是含更大素数的数字数量更少，而 $2$ 无论如何都有数与之配对。

- 构造一下 Test 4：
> $$1,2,3,4,5,6,78,9,10,11,12,13$$
> $$1,x,x,x,x,x,7,x,x,x,11,x,13$$
> $5$ 的倍数错一位：
> $$1,2,3,4,10,6,7,8,9,5,11,12,13$$
> $3$ 的倍数错一位：
> $$1,2,6,4,10,9,7,8,12,5,11,3,13$$
> $2$ 的倍数错一位：
> $$1,4,6,8,10,9,7,2,12,5,11,3,13$$

### AC Code

```cpp
struct Prime{
    vector<bool> is_prime;vector<i64> primes;
    void sieve(int n){
        is_prime.assign(n+1,1);
        is_prime[0]=is_prime[1]=0;
        for(int i=2;i<=n;i++){
            if(is_prime[i]) primes.push_back(i);
            for(int j=0;j<primes.size()&&i*primes[j]<=n;j++){
                is_prime[i*primes[j]]=0;
                if(i%primes[j]==0) break;
            }
        }
    }
};
Prime prime;

void PRE(){
    prime.sieve(1e5+5);
}

void LuoTianyi(){
    int n;
    cin>>n;

    vector<int> a(n+1),vis(n+1);
    rep(i,1,n) a[i]=i;
    dep(i,n,n/2+1){
        if(!prime.is_prime[i]) continue;
        vis[i]=1;
    }

    dep(i,n/2,2){
        if(!prime.is_prime[i]||vis[i]) continue;
        vector<int> temp;
        rep(j,1,n/i){
            if(!vis[i*j]){
                temp.push_back(a[i*j]);
            }
        }

        int cnt=1;
        rep(j,1,n/i){
            if(!vis[i*j]){
                a[i*j]=temp[(cnt++)%temp.size()];
                vis[i*j]=1;
            }
        }
    }

    rep(i,1,n) cout<<a[i]<<' ';
    ENDL;
}
```

## G

### 思路

- 观察操作 2，我们不难得到该赋值操作只可以得到 $[0,m)$ 的数字，由于我们需要查询整个区间是否在修改后单调非递减，单点修改区间查询，不难想到去差分。
- 把 $k$ 连续加若干次，等价于每次把元素加上 $\gcd(k,m)$，证明：

$$
\begin{align*}
&\quad (a+nk)\bmod m\newline
&=a+nk-m\lfloor\frac{a+nk}{m}\rfloor\newline
&\equiv a+nk\pmod{m}\newline
&\equiv a+n\gcd(k,m)\pmod{m}
\end{align*}
$$

- 要把数组变的非递减，其实只关心每个相邻位置之间，能否把 $a_{i}$ 变大，使 $a_{i-1}\leq a_{i}$，保证每次只增加 $\gcd(k,m)$ 的整数倍。但是我们又注意到，不管怎么增大，$a_i<m$ 恒成立，故总的增量严格小于 $m$。
- 那如何记录增量，我们注意到，尽管 $m$ 很大，但是 $m$ 的因数即 $\gcd(k,m)$ 可能的取值其实非常少，那我们可以直接拆解因数，枚举 $\gcd(k,m)$，在每次单点修改操作时修改所有 $\gcd(k,m)$ 可能取值的总增量，和差分数组一起维护就可以了。

### AC Code

```cpp
void LuoTianyi(){
    int n,m,q;
    cin>>n>>m>>q;
    vector<int> a(n+1),diff(n+1);
    map<int,i64> mp;

    rep(i,1,n){
        cin>>a[i];
        diff[i]=a[i]-a[i-1];
    }

    map<int,i64> ans;
    vector<int> factors;

    for(int i=1;i*i<=m;++i){
        if(m%i==0){
            factors.push_back(i);
            if(i!=m/i) factors.push_back(m/i);
        }
    }

    rep(i,1,n){
        for(int d:factors){
            ans[d]+=(diff[i]%d+d)%d;
        }
    }

    auto case1=[&]()->void{
        int i,x;
        cin>>i>>x;

        for(int d:factors){
            ans[d]-=(diff[i]%d+d)%d;
            if(i!=n) ans[d]-=(diff[i+1]%d+d)%d;
        }

        diff[i]=x-a[i-1];
        if(i!=n) diff[i+1]=a[i+1]-x;
        a[i]=x;

        for(int d:factors){
            ans[d]+=(diff[i]%d+d)%d;
            if(i!=n) ans[d]+=(diff[i+1]%d+d)%d;
        }
    };

    auto case2=[&]()->void{
        int k;
        cin>>k;
        if(ans[gcd(k,m)]>=m) No;
        else Yes;
    };

    while(q--){
        int x;
        cin>>x;
        if(x==1) case1();
        else case2();
    }
}
```
