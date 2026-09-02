---
title: The 2025 ICPC Asia East Continent Online Contest (I) 题解
description: The 2025 ICPC Asia East Continent Online Contest (I) A、B、G、I、M 参考题解，C、D 暂待补充。
date: 2026.09.03
tags: [ICPC, 算法竞赛, 题解]
---

> 比赛链接：[The 2025 ICPC Asia East Continent Online Contest (I)](https://qoj.ac/contest/2513)\
> 榜单链接：[外榜 - 2025 ICPC Asia EC网络预选赛 - 第一场](https://pintia.cn/rankings/1962439589388427264)

## A

### 思路

对于同一支队伍的同一道题，我们先将所有提交按照时间排序。遇到 Rejected，就将这次提交产生的 $20$ 分钟罚时记录下来；遇到 Accepted，直接清算这道题贡献的 1 个过题数和他产生的罚时，后面就不需要管这道题了；遇到 Unknown，那么最好情况下可以让第一发 Unknown 通过，最差情况下则让这道题不通过。

因此，我们分别维护每支队伍能够取得的最好成绩 teamMax 和最差成绩 teamMin。其中最好成绩将每道题最早可能通过的 Unknown 看作 Accepted，最差成绩则将所有 Unknown 都看作 Rejected。

接下来考虑一支队伍能否夺冠。显然，我们可以让这支队伍取得最好成绩，同时让其他队伍都取得最差成绩，因为每一条 Unknown 的结果都是相互独立的。取所有队伍的最差成绩中最好的一个为 Min。那么一支队伍能够夺冠，当且仅当它的 teamMax 不差于 Min。如果连最好成绩都比 Min 差，那么一定不可能夺冠；否则让它取得最好成绩，其他队伍取得最差成绩即可。

成绩比较时，先比较通过题数，通过题数相同再比较罚时。

### AC Code

```cpp
void solve(){
    int s;
    cin>>s;

    struct subs{
        string tnm,pid,res;
        int t;
    };
    map<pair<string,string>,vector<subs>> sub;
    map<string,pair<int,int>> teamMax,teamMin;

    for(int i=1;i<=s;i++){
        subs tem;
        auto &[tnm,pid,res,t]=tem;
        cin>>tnm>>pid>>t>>res;
        sub[{tnm,pid}].push_back(tem);
    }

    for(auto &[pr,sus]:sub){
        sort(sus.begin(),sus.end(),[&](auto x,auto y){
            return x.t<y.t;
        });
        int pe=0;
        for(auto &[tnm,pid,res,t]:sus){
            // cerr<<'*'<<tnm<<' '<<pid<<' '<<res<<' '<<t<<endl;
            if(res=="Unknown"){
                teamMax[tnm].first++;
                teamMax[tnm].second+=pe+t;
                // cerr<<"!";
                break;
            } else if(res=="Accepted"){
                teamMax[tnm].first++;
                teamMax[tnm].second+=pe+t;
                teamMin[tnm].first++;
                teamMin[tnm].second+=pe+t;
                // cerr<<"!>";
                break;
            } else if(res=="Rejected") {
                pe+=20;
            }
        }
        // cerr<<pe<<endl;
    }
    vector<string> ans;

    pair<int,int> Min={0,1e9};
    for(auto [tnm2,pr2]:teamMin){
        if(Min.first==pr2.first){
            if(Min.second>pr2.second) Min=pr2;
        }
        if(Min.first<pr2.first) Min=pr2;
    }

    for(auto [tnm,pr]:teamMax){
        int f=0;
        // cerr<<tnm<<' '<<pr.first<<' '<<pr.second<<endl;
        // cerr<<tnm<<'@'<<teamMin[tnm].first<<' '<<teamMin[tnm].second<<endl;
        if(pr.first==Min.first){
            if(pr.second>Min.second) f=1;
        }
        if(pr.first<Min.first) f=1;
        if(!f) ans.push_back(tnm);
    }

    sort(ans.begin(),ans.end());
    for(auto i:ans) cout<<i<<' ';
    cout<<endl;
}
```

## B

### 思路

凭直觉，我们希望剩余位置对于 $n$ 的各种因子都尽量均匀地分布在不同余数类中。而连续的一段整数在模任意数时都分布得最均匀，因此直接留下连续的 $n-k$ 个位置即可。

我们直接输出 $1,2,\ldots,k$，这时候暴力测几组数据，发现没什么问题，那就交就可以了，这道题证明还是挺麻烦的。

### AC Code

```cpp
void solve(){
    int n,k;
    cin>>n>>k;

    for(int i=1;i<=k;i++) cout<<i<<' ';
}
```

## C

### 思路

**TODO**

### AC Code

```cpp
//TODO
```

## D

### 思路

**TODO**

### AC Code

```cpp
//TODO
```

## G

### 思路

这题本质上就是冒泡排序。

我们知道，如果一个排列还没有排好序，那么一定存在一对相邻位置满足 $p_i > p_{i+1}$，因此，只要题目给出的操作中包含所有相邻位置 $(1,2),(2,3),\ldots,(n-1,n)$，不断重复这些操作，就一定可以像冒泡排序一样将排列排好。

具体来说，假设当前排列还没有排好，但完整执行一轮操作后一次交换都没有发生。由于这一轮中没有发生交换，所以排列始终没有变化。当前排列存在某一对相邻逆序 $p_i>p_{i+1}$，而操作中又包含 $(i,i+1)$，执行到这次操作时就一定会交换，产生矛盾。

所以只要排列还没有排好，每一轮就至少会发生一次交换，每次交换的都是一对满足 $a < b, p_a > p_b$ 的位置，因此排列的逆序对数量一定会减少。一个长度为 $n$ 的排列最多只有 $\frac{n(n-1)}2$ 个逆序对，显然远小于 $10^{18}$，所以题目给出的循环次数一定足够。

反过来，如果缺少某一对相邻位置 $(i,i+1)$，我们可以构造排列 $1,2,\ldots,i-1,i+1,i,i+2,\ldots,n$，这个排列中只有 $i$ 和 $i+1$ 的顺序错误，而其他任意操作都不会发生交换。由于 $(i,i+1)$ 不存在，这个排列永远无法被排好。

因此，答案为 Yes 当且仅当所有相邻位置对都出现过。

### AC Code

```cpp
void solve(){
    int n,m;
    cin>>n>>m;
    map<int,int> mp;
    for(int i=1;i<=m;i++){
        int a,b;
        cin>>a>>b;
        if(b==a+1) mp[a]++;
    }

    for(int i=1;i<n;i++) if(!mp[i]){
        cout<<"No";
        return;
    }
    cout<<"Yes";
}
```

## I

### 思路

全图所有点最终都需要走到同一个汇点 $t$，而且原图是无向图，所以可以把路径反过来，直接从 $t$ 出发跑一遍单源最短路。

> 这里反向走不会影响答案。对于一条路径，装背包的过程本质上是将路径上的边权序列分成若干个连续段，要求每一段的边权和不超过 $V$。将这些连续段整体反过来以后，每一段的和不会改变，所以一条路径正着走和反着走，最少需要的背包数量相同。

这里的最短路并不是最小化经过的边权和，而是最小化使用的背包数量，但是只维护背包数量是不够的，假如到达同一个点的两种方案使用了相同数量的背包，那么当前背包剩余容量更大的方案显然更优，因为它之后更不容易更换背包。因此，考虑使用一个 pair 维护状态，在起点 $t$ 时，我们已经拿着一个容量为 $V$ 的新背包，所以初始状态为 $dist_t=(1,V)$。

考虑从点 $u$ 经过一条权值为 $w$ 的边到达点 $v$。如果当前背包的剩余容量足够，也就是 $rest_u\ge w$，那么不需要更换背包，转移为 $dist_v=(cnt_u,rest_u-w)$；否则就丢弃当前背包并换一个新背包，转移为 $dist_v=(cnt_u+1,V-w)$。

于是只需要改一下普通的最短路板子，每次根据剩余容量计算出经过这条边后的新 pair，再按照自定义排序进行松弛，最后从 $t$ 跑完一次最短路以后，$dist_i.first$ 就是从点 $i$ 到达点 $t$ 最少需要的背包数量，不可达的点输出 $-1$ 即可。

### AC Code

```cpp
int V;

struct Dij {
    const i64 INF = LLONG_MAX / 3;
    struct edge {
        int v;
        i64 w;
    };
    struct node {
        pair<i64,i64> dist;
        int u;
        bool operator>(const node& a) const {
            if(dist.first!=a.dist.first) return dist.first > a.dist.first;
            return dist.second < a.dist.second;
        }
    };
    int n;
    vector<vector<edge>> G;
    vector<pair<i64,i64>> dist;
    vector<int> vis, parent;
    Dij(int N) : n(N), G(N + 1), dist(N + 1), vis(N + 1), parent(N + 1, -1) {}
    void add(int u, int v, i64 w) { G[u].push_back({v, w}); }
    vector<pair<i64,i64>> dij(int src) {
        fill(dist.begin(), dist.end(), make_pair(INF,0));
        fill(vis.begin(), vis.end(), 0);
        fill(parent.begin(), parent.end(), -1);
        priority_queue<node, vector<node>, greater<node>> pq;
        dist[src] = {1,V};
        pq.push({{1,V}, src});
        while(!pq.empty()) {
            int u = pq.top().u;
            pq.pop();
            if(vis[u]) continue;
            vis[u] = 1;
            for(auto [v, w] : G[u]) {
                auto tar=dist[u];
                if(tar.second>=w) tar.second-=w;
                else{
                    tar.second=V-w;
                    tar.first++;
                }
                if(dist[v].first > tar.first || (dist[v].first == tar.first
                    && (dist[v].second < tar.second) )) {
                    dist[v] = tar;
                    parent[v] = u;
                    pq.push({dist[v], v});
                }
            }
        }
        return dist;
    }
};

void solve(){
    int n,m,t;
    cin>>n>>m>>V>>t;
    Dij dij(n);
    for(int i=1;i<=m;i++){
        int x,y,w;
        cin>>x>>y>>w;
        dij.add(x,y,w);
        dij.add(y,x,w);
    }
    dij.dij(t);
    for(int i=1;i<=n;i++){
        if(dij.dist[i].first != dij.INF) cout<<dij.dist[i].first<<' ';
        else cout<<-1<<' ';
    }
}
```

## M

### 思路

本质分层图，设当前处于第 $x$ 层，$dp_{i,x}$ 表示从编号为 $i$ 的点出发，最多使用 $x$ 次传送到达点 $1$ 的最短距离，考虑如何在不同层之间转移。

第 $0$ 层不能使用传送，所以 $dp_{i,0}=\operatorname{dis}(i,1)$。我们直接将树以 $1$ 为根进行一次 DFS，在求出 $fa$ 和 $dfn$ 的同时，计算每个点到根的距离。接下来考虑如何从第 $x-1$ 层转移到第 $x$ 层。

首先令 $dp_{i,x}=dp_{i,x-1}$，表示新增的这次传送可以不使用。然后枚举所有传送边，对于一条从 $p$ 到 $q$ 的传送边，我们可以从 $p$ 直接传送到 $q$，再按照上一层的最优方案从 $q$ 到达点 $1$，因此有 $dp_{p,x}=\min(dp_{p,x},dp_{q,x-1})$，传送边是双向的，直接两个方向当两个边存，枚举一遍 $f$ 即可。

枚举完传送边以后，$dp_{i,x}$ 只考虑了在点 $i$ 原地使用传送的情况。但是从点 $i$ 出发时，我们还可以先沿树边走到某个点 $k$，再使用 $dp_{k,x}$ 对应的方案。因此 $dp_{i,x}=\min_k(dp_{k,x}+\operatorname{dis}(i,k))$。

但是如果直接枚举所有 $i$ 和 $k$，每一层需要 $O(n^2)$，一共有 $O(n)$ 层，总复杂度会达到 $O(n^3)$，考虑优化。我们发现，这个转移本质上是一次树上的多源最短路。每个点 $k$ 的初始距离为当前的 $dp_k$，接下来让这些答案沿树边进行松弛即可。

树上任意两点之间的路径，都需要先向树根方向走到 LCA，再从 LCA 向树叶方向走。因此，我们可以先从儿子向父亲松弛一遍，再从父亲向儿子松弛一遍。

- 第一次按照 $dfn$ 的逆序枚举节点，此时儿子一定先于父亲被处理，进行转移 $dp_{fa_i,x}=\min(dp_{fa_i,x},dp_{i,x}+w(i,fa_i))$，这一遍可以将每棵子树中的最优答案不断向上传递。

- 第二次按照 $dfn$ 的正序枚举节点，此时父亲一定先于儿子被处理，进行转移 $dp_{i,x}=\min(dp_{i,x},dp_{fa_i,x}+w(i,fa_i))$，这一遍再将来自祖先和其他子树的最优答案向下传递。

对于任意两个点 $k$ 和 $i$，第一遍可以将点 $k$ 的答案向上传到 $\operatorname{LCA}(k,i)$，第二遍再从 LCA 向下传到点 $i$，因此两遍松弛后，所有 $dp_{k,x}+\operatorname{dis}(i,k)$ 都已经被计算。

每一层枚举传送边需要 $O(m)$，在树上进行两遍松弛需要 $O(n)$，一共进行 $n$ 次转移，所以总时间复杂度为 $O(n^2+nm)$。我们注意到 $dp$ 可以使用滚动数组，DP 部分的空间复杂度为 $O(n)$。不过当前代码使用 $n\times n$ 的二维数组 $w$ 保存树边权，因此整份代码的实际空间复杂度为 $O(n^2+m)$。

### AC Code

```cpp
void solve(){
    int n,m;
    cin>>n>>m;
    vector<vector<int>> g(n+1),w(n+1,vector<int>(n+1));
    for(int i=1;i<n;i++){
        int u,v,x;
        cin>>u>>v>>x;
        g[u].push_back(v);
        g[v].push_back(u);
        w[u][v]=w[v][u]=x;
    }
    vector<pair<int,int>> f;
    for(int i=1;i<=m;i++){
        int p,q;
        cin>>p>>q;
        f.push_back({p,q});
        f.push_back({q,p});
    }
    vector<int> dfn(n+1),nfd(n+1);
    int cnt=1;
    vector<int> fa(n+1);
    vector<i64> dp(n+1);

    auto dfs=[&](auto dfs,int u,int f) ->void {
        dfn[u]=cnt++;
        nfd[cnt-1]=u;
        for(auto v:g[u]){
            if(v==f) continue;
            fa[v]=u;
            dp[v]=dp[u]+w[u][v];
            dfs(dfs,v,u);
        }
    };
    dfs(dfs,1,0);

    for(int x=0;x<=n;x++){
        i64 ans=0;
        for(int i=1;i<=n;i++) ans+=dp[i];
        cout<<ans<<endl;
        vector<i64> ndp=dp;
        for(auto [p,q]:f) ndp[p]=min(ndp[p],dp[q]);
        for(int i=n;i>1;i--)
            ndp[fa[nfd[i]]]=min(ndp[fa[nfd[i]]],ndp[nfd[i]]+w[nfd[i]][fa[nfd[i]]]);
        for(int i=2;i<=n;i++)
            ndp[nfd[i]]=min(ndp[nfd[i]],ndp[fa[nfd[i]]]+w[nfd[i]][fa[nfd[i]]]);
        dp=ndp;
    }
}
```
