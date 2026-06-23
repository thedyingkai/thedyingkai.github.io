---
title: 线性代数模板
description: 矩阵快速幂、逆矩阵、高斯消元、线性方程组和行列式。
date: 2025.07.10
tags: [数学, 板子, 线性代数]
---

- 浮点数和整数下矩阵快速幂，逆矩阵，高斯消元，线性方程组求解，行列式求值

```cpp
using d128=long double;
using i64=long long;

template<class T> struct Matrix{
    #define _rep(i,x,n) for(int i=x;i<n;i++)
    static const int MOD=1000000007;
    static constexpr bool _m_=is_integral<T>::value;// 整数取模，浮点直接算
    int n,m;
    vector<vector<T>> rec;
    Matrix(int _n=0,int _m=0,T _x=0){
        n=_n,m=_m;
        rec.resize(_n,vector<T>(_m,_x));
    }
    vector<T>& operator[](int i){
        return rec[i];
    }
    const vector<T>& operator[](int i)const{
        return rec[i];
    }
    // ---- 工具函数 ----
    static T add(T a,T b){
        if constexpr(_m_){
            T s=a+b;
            if(s>=MOD) s-=MOD;
            return s;
        }
        else return a+b;
    }
    static T sub(T a,T b){
        if constexpr(_m_){
            T d=a-b;
            if(d<0) d+=MOD;
            return d;
        }
        else return a-b;
    }
    static T mul(T a,T b){
        if constexpr(_m_){
            return (a*b%MOD);
        }
        else return a*b;
    }
    static T modPow(T a,T e){
        if constexpr(_m_){
            T r=1%MOD;
            T x=(a%MOD+MOD)%MOD;
            while(e){
                if(e&1) r=r*x%MOD;
                x=x*x%MOD;
                e>>=1;
            }
            return r;
        }
        else{
            T r=1;
            while(e){
                if(e&1) r=r*a;
                a=a*a;
                e>>=1;
            }
            return r;
        }
    }
    static T Inv(T a){
        if constexpr(_m_) return modPow(a,MOD-2);
        else return 1/a;
    }
    static bool isZero(T v){
        if constexpr(_m_) return v==0;
        else{
            const d128 EPS=1e-12;
            return fabsl((d128)v)<EPS;
        }
    }
    // ---- 矩阵乘法 ----
    friend Matrix operator*(const Matrix &a,const Matrix &b){
        Matrix res(a.n,b.m);
        _rep(k,0,a.m) _rep(i,0,res.n) if(!isZero(a[i][k])) _rep(j,0,res.m) res[i][j]=add(res[i][j],mul(a[i][k],b[k][j]));
        return res;
    }
    // ---- 快速幂 ----
    Matrix qp(Matrix base,T k){
        Matrix res(base.n,base.m);
        _rep(i,0,res.n) res[i][i]=1;
        while(k){
            if(k&1) res=res*base;
            base=base*base;
            k>>=1;
        }
        return res;
    }
    // ---- 高斯消元 ----
    int Gauss(vector<vector<T>>* aug=0,vector<int>* w=0,d128* det=0){
        if(w) w->assign(m,-1);
        if(det) *det=1;
        int rank=0;
        for(int c=0,r=0;c<m&&r<n;c++){
            int idx=-1;
            d128 best=0;
            _rep(i,r,n) if(!isZero(rec[i][c])){
                if constexpr(_m_){
                    idx=i;
                    break;
                }
                else if(fabsl((d128)rec[i][c])>best){
                    best=fabsl((d128)rec[i][c]);
                    idx=i;
                }
            }
            if(idx==-1) continue;
            if(idx!=r){
                swap(rec[idx],rec[r]);
                if(aug) swap((*aug)[idx],(*aug)[r]);
                if(det) *det=-*det;
            }
            if(det) *det*=rec[r][c];
            T inv=Inv(rec[r][c]);
            _rep(j,c,m) rec[r][j]=mul(rec[r][j],inv);
            if(aug) for(auto &v:(*aug)[r]) v=mul(v,inv);
            _rep(i,0,n) if(i!=r&&!isZero(rec[i][c])){
                T k=rec[i][c];
                _rep(j,c,m) rec[i][j]=sub(rec[i][j],mul(k,rec[r][j]));
                if(aug) _rep(j,0,(*aug)[i].size()) (*aug)[i][j]=sub((*aug)[i][j],mul(k,(*aug)[r][j]));
            }
            if(w) (*w)[c]=r;
            rank++,r++;
        }
        if(det&&_m_){
            *det=fmodl(*det,MOD);
            if(*det<0) *det+=MOD;
        }
        return rank;
    }
    // ---- 行列式 ----
    d128 det() const{
        if(n!=m) return 0;
        Matrix tmp=*this;
        d128 ans;
        tmp.Gauss(0,0,&ans); return ans;
    }
    // ---- 逆矩阵 ----
    Matrix inv() const{
        if(n!=m) return Matrix();
        vector<vector<T>> aug(n,vector<T>(n,0));
        _rep(i,0,n) aug[i][i]=1;
        Matrix A=*this;
        if(A.Gauss(&aug)<n) return Matrix();
        Matrix res(n,n);
        _rep(i,0,n) _rep(j,0,n) res[i][j]=aug[i][j];
        return res;
    }
    // ---- 解线性方程 Ax=b ----
    static pair<bool,vector<T>> solveLinear(Matrix A,vector<T> b){
        int n=A.n,m=A.m;
        if((int)b.size()!=n){
            cout<<"No Solution"<<endl;
            return {};
        }
        vector<vector<T>> col(n,vector<T>(1));
        _rep(i,0,n) col[i][0]=b[i];
        vector<int> w;
        int rank=A.Gauss(&col,&w);
        _rep(i,rank,n) if(!isZero(col[i][0])) return {0,{}};
        vector<T> x(m,0);
        _rep(i,0,m) if(w[i]!=-1) x[i]=col[w[i]][0];
        if(rank<m) return {0,{}};
        return {1,x};
    }
    // ---- I/O ----
    friend ostream& operator<<(ostream& os,const Matrix& mat){
        _rep(i,0,mat.n){
            _rep(j,0,mat.m) os<<mat[i][j]<<" ";
            os<<endl;
        }
        return os;
    }
    friend istream& operator>>(istream& is,Matrix& mat){
        _rep(i,0,mat.n) _rep(j,0,mat.m) is>>mat[i][j];
        return is;
    }
		#undef _rep
};
```
