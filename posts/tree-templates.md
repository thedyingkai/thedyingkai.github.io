# 树状数组板子

- 1-index

```cpp
template<class T,class Ele>struct BitTree{
    T n;
    vector<Ele> tree;
    BitTree(T N):n(N){tree.resize(N+1);}
    T lowbit(T x){return x&-x;}
    Ele query(T x){
        Ele res=0;
        while(x){
            res+=tree[x];
            x-=lowbit(x);
        }
        return res;
    }
    void update(T x,Ele k){
        while(x<=n){
            tree[x]+=k;
            x+=lowbit(x);
        }
    }
    bool isPow2(T x){return x&&x==lowbit(x);}
};
```

# 线段树

```cpp
template<class T,class Ele> struct SegTree{
    T n;
    struct TreeNode{
        Ele sum[2],lazy[2];
        T l,r;
        friend TreeNode operator+(const TreeNode& A,const TreeNode& B){
            TreeNode C;
            C.l=A.l;
            C.r=B.r;
            C.lazy[1]=0/* init value */;
            C.sum[1]=1/* new value */;
//            if(mod) C.sum[1]%=mod;
            return C;
        }
    };
    vector<TreeNode> tree;
    SegTree(T N,vector<Ele> a):n(N){
        tree.resize(4*N);
        build(1,1,n,a);
    }
    void initLazy(T root){
        tree[root].lazy[1]=0/* init value */;
    }
    void unionLazy(T fa,T ch){
        tree[ch].lazy[1]=1/* new value */;
    }
    void calLazy(T root){
        tree[root].sum[1]=1/* new value */;
    }
    void pushDown(T root){
        if(tree[root].lazy[1]!=0/* init value */){
            calLazy(root);
            if(tree[root].l!=tree[root].r){
                T ch=root<<1;
                unionLazy(root,ch);
                unionLazy(root,ch+1);
            }
            initLazy(root);
        }
    }
    void update(T root){
        T ch=root<<1;
        pushDown(ch);
        pushDown(ch+1);
        tree[root]=tree[ch]+tree[ch+1];
    }
    void build(T root,T l,T r,const vector<Ele>& a){
        tree[root].l=l;
        tree[root].r=r;
        initLazy(root);
        if(l!=r){
            T mid=l+r>>1;
            T ch=root<<1;
            build(ch,l,mid,a);
            build(ch+1,mid+1,r,a);
            update(root);
        }
        else{
            Ele tem=a[l];
//            if(mod) tem%=mod;
            tree[root].sum[1]=tem;
        }
    }
    void update(T root,T l,T r,Ele val,int op){
        pushDown(root);
        if(l==tree[root].l&&r==tree[root].r){
//            if(mod) val%=mod;
            tree[root].lazy[op]=val/* change val */;
            return;
        }
        T mid=tree[root].l+tree[root].r>>1;
        T ch=root<<1;
        if(r<=mid) update(ch,l,r,val,op);
        else if(l>mid) update(ch+1,l,r,val,op);
        else{
            update(ch,l,mid,val,op);
            update(ch+1,mid+1,r,val,op);
        }
        update(root);
    }
    TreeNode query(T root,T l,T r){
        pushDown(root);
        if(l==tree[root].l&&r==tree[root].r) return tree[root];
        T mid=tree[root].l+tree[root].r>>1;
        T ch=root<<1;
        if(r<=mid) return query(ch,l,r);
        else if(l>mid) return query(ch+1,l,r);
        else return query(ch,l,mid)+query(ch+1,mid+1,r);
    }
};
```