---
title: "统计学习基础：回归分析"
date: 2026-02-09
draft: false
description: "线性回归与模型评估指标"
tags: ["机器学习", "统计学习", "回归分析"]
categories: ["学习笔记"]
math: true
---

## 📊 回归分析基础

回归分析是统计学习中最基础也是最重要的方法之一。

## 1. 线性回归

### 模型形式
$$y = \beta_0 + \beta_1 x_1 + \beta_2 x_2 + \cdots + \beta_p x_p + \epsilon$$

其中：
- $y$ 是响应变量
- $x_1, x_2, \ldots, x_p$ 是预测变量
- $\beta_0, \beta_1, \ldots, \beta_p$ 是参数
- $\epsilon$ 是误差项

## 2. 评估指标

### MSE (均方误差)
$$MSE = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2$$

### $R^2$ (决定系数)
$$R^2 = 1 - \frac{SS_{res}}{SS_{tot}}$$

衡量模型解释数据变异的能力。

## 3. Python 实现

```python
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

# 创建模型
model = LinearRegression()

# 训练模型
model.fit(X_train, y_train)

# 预测
y_pred = model.predict(X_test)

# 评估
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"MSE: {mse:.4f}")
print(f"R²: {r2:.4f}")
```

## 📚 参考资料

- [An Introduction to Statistical Learning](https://www.statlearning.com/)
- Scikit-learn 官方文档
