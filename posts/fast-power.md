## 普通快速幂

最基础的快速幂直接贴板子，推导过程我不太感兴趣。

```cpp
using i64=long long;

i64 qp(i64 a,i64 b,i64 p){
    i64 res=1;
    while(b>0){if(b&1) res=res*a%p; a=a*a%p; b>>=1;}
    return res%p;
}
```

## 快速幂求逆元

然后，在这个快速幂的基础上，我们可以用它去求逆元。原理用费马小定理易推，即模 $p$ 意义下 $a^{p-2}$ 等于 $a$ 的逆元，使用条件是 $p$ 为素数且 $\gcd(a,p)=1$。

```cpp
using i64=long long;

i64 qp(i64 a,i64 b,i64 p){
    i64 res=1;
    while(b>0){if(b&1) res=res*a%p; a=a*a%p; b>>=1;}
    return res%p;
}

i64 inv(i64 a,i64 p){return qp(a,p-2,p);}
```

## 矩阵快速幂

- 快速幂不只是能求整数的幂，也能求矩阵的幂。

```cpp
#define _rep(i,x,n) for(int i=x;i<n;i++)
using i64=long long;

template<class T> struct Matrix{
    int n,m;
    vector<vector<T>> rec;
    vector<T>& operator[](int i){return rec[i];}
    const vector<T>& operator[](int i)const{return rec[i];}
    friend Matrix operator*(const Matrix &a,const Matrix &b){
        Matrix res(a.n,b.m);
        _rep(k,0,a.m) _rep(i,0,res.n) if(!isZero(a[i][k])) _rep(j,0,res.m) res[i][j]=add(res[i][j],mul(a[i][k],b[k][j]));
        return res;
    }
}

Matrix qp(Matrix base,i64 k){
    Matrix res(base.n,base.m);
    _rep(i,0,res.n) res[i][i]=1;
    while(k){
        if(k&1) res=res*base;
        base=base*base;
        k>>=1;
    }
    return res;
}
```

## 快速幂的扩展

- 这是我个人的理解：对于任何一个群，定义一个乘法运算，我们就可以用快速幂求他的 $n$ 次乘法积。我们先找到他的幺元，也就是板子里面的 $res$，再通过结构体重载该群定义的乘法 `*`，我们就可以快速求出 $n$ 次幂。

## 高精度快速幂

- 那我们也能容易的得到高精度的快速幂，使用字符串或压位数组来存储数字，重载乘法运算符，就可以实现快速幂了。

> 高精度乘法可以使用快速傅里叶变换（FFT）乘法或分治加速。

```cpp
using i64=long long;

struct BigInt{
    vector<int> d;
    BigInt(string s="0"){for(int i=s.size()-1;i>=0;--i) d.push_back(s[i]-'0');}
    BigInt(vector<int>&& v):d(std::move(v)){}
    BigInt operator*(const BigInt&b)const{
        vector<int>v(d.size()+b.d.size());
        for(int i=0;i<d.size();++i)
            for(int j=0;j<b.d.size();++j){
                v[i+j]+=d[i]*b.d[j];
                v[i+j+1]+=v[i+j]/10;
                v[i+j]%=10;
        }
    while(v.size()>1&&v.back()==0) v.pop_back();
    return BigInt(move(v));
    }
    friend ostream& operator<<(ostream&os,const BigInt&x){
        for(int i=x.d.size()-1;i>=0;--i) os<<x.d[i];
        return os;
    }
};

BigInt qp(BigInt a,i64 b){
    BigInt res("1");
    for(;b;b>>=1){
        if(b&1) res=res*a;
        a=a*a;
    }
    return res;
}
```

## 龟速乘

- 另附龟速乘，我理解的主要用途是防止大数爆掉。其实本质来说是我钦定加法运算为乘法，因为任何数加上 $0$ 都是它本身，所以 $0$ 是幺元，还是快速幂。

```cpp
using i64=long long;

i64 s_mul(i64 a,i64 b,i64 p){
    int res=0;
    for(;b;b>>=1){
        if(b&1) res=(res+a)%p;
        a=(a+a)%p;
    }
    return res%p;
}
```