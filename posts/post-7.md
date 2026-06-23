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
    cin>>s;
    bool vis[27]={0};
    rep(i,0,s.length()-1) vis[s[i]-'a']=1;
    rep(i,0,25) if(!vis[i]){
        cout<<(char)(i+'a');
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
    cin>>n;
    vector<string> s(n),t(n);
    rep(i,0,n-1) cin>>s[i];
    rep(i,0,n-1) cin>>t[i];
    ll ans=LLONG_MAX;
    rep(i,0,3){
        if(i!=0){
            vector<string> tem(n,string(n,' '));
            rep(ii,0,n-1) rep(jj,0,n-1) tem[jj][n-1-ii]=s[ii][jj];
            s.swap(tem);
        }
        ll cnt=0;
        rep(ii,0,n-1) rep(jj,0,n-1) if(s[ii][jj]!=t[ii][jj]) cnt++;
        ans=min(ans,i+cnt);
    }
    cout<<ans;
}
```
	
## C
	
### 思路
	
如果一个简单无向图有 $N$ 个顶点，$M$ 条边，想形成一张环图，每个顶点的度必须严格等于 $2$，并且 $N=M$。
	
> 因为环上的每一个点连接且仅连接两个点，并和这两个点分别共享一条边，即每 $1$ 个点分得 $1 \div 2 \times 2 = 1$ 条边。

因此，我们在存图时存入每个顶点的度数，若该图是环图，只要该点存在（$d_i \neq 0$）,该点的度数只能是 $2$。

但是这样就是正解吗？我们考虑到在上面的约束条件下，可能形成不止一个环图，所以从任意一个顶点开始，看能不能遍历所有顶点。 然后使用广度优先搜索，每经过一个未到达过的顶点，$cnt$ 加一，如果 $cnt=N$，证明是环图，且不存在多个环。
	
> 如果有不止一个环存在，我们可以想象的到，每个环彼此之间不是连通的，不能使用广度优先搜索遍历到每一个顶点。
	
### AC code
	
```cpp
void solve(){
    int n,m;
    cin>>n>>m;
    vector<int> G[n+1],d(n+1);
    rep(i,1,m){
        int u,v;
        cin>>u>>v;
        G[u].push_back(v);
        G[v].push_back(u);
        d[u]++,d[v]++;
    }
    if(m!=n){
        No;
        return;
    }
    for(auto u:d) if(u!=2&&u!=0){
        No;
        return;
    }
    vector<bool> vis(n+1);
    queue<int> q;
    vis[1]=1;
    q.push(1);
    int cnt=1;
    while(!q.empty()){
        int u=q.front();
        q.pop();
        for(auto w:G[u]) if(!vis[w]){
            vis[w]=1;
            q.push(w);
            cnt++;
        }
    }
    if(cnt!=n) No;
    else Yes;
}
```
	
## D
	
### 思路
	
- 每种动物需要被访问两次，也就是同一个动物园访问至多两次之后就没有意义了，枚举每个动物园的访问次数 $\{0,1,2\}$，共 $3^{10}$ 种组合，可以过。
	
- 检查一下每个动物是否被看到至少两次，更新一下答案最小值就行了，还可以再顺便剪个枝，已经超过最小值后面就不用看了。
	
### AC code
	
```cpp
void solve(){
    int n,m;
    cin>>n>>m;
    vector<ll> c(n+1);
    vector<vector<int>> a(m+1,vector<int>(1));
    rep(i,1,n) cin>>c[i];
    rep(i,1,m){
        int k;
        cin>>k;
        a[i].resize(k);
        rep(j,0,k-1) cin>>a[i][j];
    }
    ll ans=LLONG_MAX;
    vector<int> x(n+1);
    auto dfs=[&](int i,ll sum,auto self)->void{
        if(i>n){
            rep(j,1,m){
                int cnt=0;
                for(auto it:a[j]) cnt+=x[it];
                if(cnt<2) return;
            }
            ans=min(ans,sum);
        }
        for(auto it:{0,1,2}){
            ll tem=sum+it*c[i];
            if(tem>=ans) continue;
            x[i]=it;
            self(i+1,tem,self);
        }
    };
    dfs(1,0,dfs);
    cout<<ans<<endl;
}
```
	
## E
	
### 思路
	
- 这道题可以不 DP，考虑贪心。
	
- 题目的意思很简单，对于一排 $N$ 个碗，每次操作都可以选择一个碗 $i$，把该碗的豆子自由分配到该碗和前面紧挨的 $c_i$ 个碗中，求把所有豆子移到最左边需要的最小操作次数。
	
- 对于 $a_i=0$ 的碗，即空碗，我们先不进行操作。而对于 $a_i \neq 0$ 的碗，每个碗至少要操作一次来移除其中的豆子，我们创建一个自定义的优先队列存储该碗豆子能分给的碗的区间左右端点，以右端点降序排列。
	
- 检查区间 $[l,r]$ 是否已经被部分覆盖，对于每个无法直接访问的区间，找到最优的碗进行操作，使区间覆盖范围最远，操作后标记该碗，并增加新的区间到优先队列中，重复上述过程直到所有区间都可以被访问。
	
> ~~说不是 DP，其实有 DP 的味道在的。~~
	
### AC code
	
```cpp
#define pii pair<int,int>
void solve(){
    int n;
    cin>>n;
    vector<int> c(n),a(n);
    rep(i,1,n-1) cin>>c[i];
    rep(i,1,n-1) cin>>a[i];
    int ans=0;
    set<int> vis={0};
    rep(i,1,n-1) if(a[i]){
        ans++;
        vis.insert(i);
    }
    priority_queue<pii,vector<pii>,
        function<bool(pii,pii)>> pq([](pii x,pii y){return x.second>y.second;});
    rep(i,1,n-1) if(a[i]){
        int l=i-c[i];
        if(l>0) pq.push({l,i-1});
    }
    while(!pq.empty()){
        auto [l,r]=pq.top();
        pq.pop();
        auto it=vis.lower_bound(l);
        if(it!=vis.end()&&*it<=r);
        else{
            int res=l;
            int Min=l-c[l];
            rep(i,l+1,r){
                int cur=i-c[i];
                if(cur<Min){
                    res=i;
                    Min=cur;
                }
            }
            ans++;
            vis.insert(res);
            if(Min>0) pq.push({Min,res-1});
        }
    }
    cout<<ans<<endl;
}
```
