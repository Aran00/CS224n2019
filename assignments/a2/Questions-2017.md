1. Softmax: Omitted
2. Neural Network Basics
 a. $\frac{\partial \sigma(x)}{\partial x} = -\frac{-e^{-x}}{(1+e^{-x})^2} = \sigma(x)(1-\sigma(x))$
 
 b. And only k-th dimension of $\boldsymbol{y}$ is 1, so
	$$s = CE(\boldsymbol{y}, \boldsymbol{\hat{y}}) = - \sum_{i} y_i log(\hat{y_i}) = -log(\hat{y_k})$$
	As $\boldsymbol{\hat{y}} = softmax(\boldsymbol{\theta})$, we have
	$$\hat{y_k}=softmax(\boldsymbol{\theta})_k = \frac{e^{\boldsymbol{\theta}_{k}}}{\sum_{j}{e^{\boldsymbol{\theta}_j}}}$$
Then 
	$$\frac{\partial s}{\partial \theta_i} = \frac{\partial{s}}{\partial \hat{y_k}}\frac{\partial \hat{y_k}}{\partial \theta_i}=-\frac{1}{\hat{y_k}} \frac{\partial \hat{y_k}}{\partial \theta_i} $$
In which 
$$ \frac{\partial \hat{y_k}}{\partial \theta_i} = 
\begin{cases} 
	\hat{y_i} (1-\hat{y_i} ) & i = k \\
	-\hat{y_k}\hat{y_i} & i \neq k
\end{cases}
$$
So the last result is
$$\frac{\partial s}{\partial \boldsymbol{\theta}}=\boldsymbol{\hat{y}} - \boldsymbol{y}$$ 
Surprisingly simple...

 c. I think it's good to regard $\boldsymbol{x}$ as a row vector...
 As 
 $$
 J = CE(\boldsymbol{y}, \boldsymbol{\hat{y}}) \\ 
 \boldsymbol{\hat{y}} = softmax(\boldsymbol{\theta}) \\
 \boldsymbol{\theta} = \boldsymbol{hW_2 + b_2} \\
 \boldsymbol{h} = sigmoid(\boldsymbol{a}) \\
 \boldsymbol{a} = \boldsymbol{xW_1+b_1}
 $$
 where there dimensions are:
 $$
 \boldsymbol{x} : 1 * D_x \\
 W_1: D_x * H \\
 \boldsymbol{a, b_1, h}: 1 * H \\
 W_2: H * D_y \\
 \boldsymbol{\theta, b_2, \hat{y}}: 1 * D_y
 $$
 Let's play a dangerous game, only care about dimension:
 $$
 \frac{\partial J}{\partial \boldsymbol{x}} = \frac{\partial J}{\partial \boldsymbol{a}} {W_1^T} = \sigma^{\prime}(\boldsymbol{a}) \circ \frac{\partial J}{\partial \boldsymbol{h}} {W_1^T} \\
 = (\sigma^{\prime}(\boldsymbol{a}) \circ \frac{\partial J}{\partial \boldsymbol{\theta}}{W_2^T}) {W_1^T} \\
 = (\sigma(\boldsymbol{a})(1-\sigma(\boldsymbol{a})) \circ (\boldsymbol{\hat{y}} - \boldsymbol{y}){W_2^T}) {W_1^T}
 $$
 Where $\circ$ means element wise multiply.
 
 d. Considering $W$ and $\boldsymbol{b}$, we have 
 $$
 (D_x+1)*H + D_y(1+H)
 $$
 parameters in this NN.
 
 e-g: See in code.

3. Word2Vec

 a. As the loss function is 
$$
J_{softmax-CE}(\boldsymbol{o, v_c, U}) = CE(\boldsymbol{y, \hat{y}})
$$
and let 
$$
\boldsymbol{\theta} = 
\begin{bmatrix} u_1^T v_c \\ ... \\ u_W^T v_c \end{bmatrix}
=\begin{bmatrix} u_1^T \\ ... \\ u_W^T \end{bmatrix} v_c
= U^T v_c$$
where $U = \begin{bmatrix} u_1 & u_2 & ... & u_W \end{bmatrix}$

We have $\frac{\partial{J}}{\partial{\boldsymbol{\theta}}} = \boldsymbol{\hat{y}} - \boldsymbol{y}$. And the dimensions are:
$$
\boldsymbol{u, v}: [D, 1] \\
\boldsymbol{y, \hat{y}, \theta}: [W, 1] \\
U: [D, W]
$$
So 
$$
\frac{\partial{J}}{\partial{\boldsymbol{v_c}}} = U \frac{\partial{J}}{\partial{\boldsymbol{\theta}}}=U \boldsymbol{(\hat{y}-y)}
$$
 b. To $\boldsymbol{u_w}$, we have
$$
\frac{\partial{J}}{\partial{U}} = \boldsymbol{v_c} (\frac{\partial{J}}{\partial{\boldsymbol{\theta}}})^T = \boldsymbol{v_c(\hat{y}-y)^T}
$$
so 
$$
\frac{\partial{J}}{\partial{\boldsymbol{u_w}}}=(\hat{y_w} - y_w)\boldsymbol{v_c}=
\begin{cases} 
	(\hat{y_w} - 1)\boldsymbol{v_c} & w = o \\
	\hat{y_w} \boldsymbol{v_c} & w \neq o
\end{cases}
$$

 c. We have
$$
\frac{\partial{J_{neg-sample}}}{\partial{\boldsymbol{v_c}}} = - \frac{1}{\sigma(\boldsymbol{u_o^T v_c})} \sigma^{\prime}(\boldsymbol{u_o^T v_c}) \boldsymbol{u_o} + \sum_{k=1}^{K}\frac{1}{\sigma(\boldsymbol{- u_k^T v_c})} \sigma^{\prime}(\boldsymbol{-u_k^T v_c}) \boldsymbol{u_k} \\
= (\sigma(\boldsymbol{u_o^T v_c}) - 1)\boldsymbol{u_o} + \sum_{k=1}^{K}({1 - \sigma(\boldsymbol{- u_k^T v_c})}) \boldsymbol{u_k}
$$

$$
\frac{\partial{J_{neg-sample}}}{\partial{\boldsymbol{u_w}}} = 
\begin{cases} 
	- \frac{1}{\sigma(\boldsymbol{u_o^T v_c})} \sigma^{\prime}(\boldsymbol{u_o^T v_c}) \boldsymbol{v_c} =   (\sigma(\boldsymbol{u_o^T v_c}) - 1) \boldsymbol{v_c} & w = o \\
	\frac{1}{\sigma(\boldsymbol{- u_w^T v_c})} \sigma^{\prime}(\boldsymbol{- u_w^T v_c}) \boldsymbol{v_c} = (1-\sigma(\boldsymbol{- u_w^T v_c})) \boldsymbol{v_c} & w \in [1, K] \\
0 & w=others	
\end{cases}
$$
Computing the cost and derivation in (a)(b) needs $O(WD)$ time complexity and in (c) needs $O(KD)$, so speed-up ratio is $W/K$

 d. Let $F \boldsymbol{(o, v_c)}$ denote $J_{softmax-CE}\boldsymbol{(o, v_c, ...)}$ or $J_{neg-sample}\boldsymbol{(o, v_c, ...)}$ cost functions in the above questions. 
For skip-gram, we have
$$J_{skip-gram}(word_{c-m ... c+m}) = \sum_{-m \leq j \leq m, j \neq 0} F(\boldsymbol{w_{c+j}, v_c})$$ 
So
$$\frac{\partial{J_{skip-gram}}}{\partial{\boldsymbol{v_i}}} = 
\begin{cases}
\sum_{-m \leq j \leq m, j \neq 0} \frac{\partial{F(\boldsymbol{w_{c+j}, v_c})}}{\partial{\boldsymbol{v_c}}} & i=c\\ 
0 & i=others
\end{cases}$$
For the sake of clarity, we will denote $U$ as the collection of all output vectors for all words
in the vocabulary. We have 
$$\frac{\partial{J_{skip-gram}}}{\partial{U}} = \sum_{-m \leq j \leq m, j \neq 0} \frac{\partial{F(\boldsymbol{w_{c+j}, v_c})}}{\partial{U}}$$
For CBOW, the cost is $J_{CBOW}(word_{c-m ... c+m}) = F(\boldsymbol{w_{c}, \hat{v}})$, so
$$\frac{\partial{J_{CBOW}}}{\partial{\boldsymbol{v_j}}} = 
\begin{cases}
\frac{\partial{F(\boldsymbol{w_{c}, \hat{v}})}}{\partial{\boldsymbol{\hat{v}}}} & c-m \leq j \leq c+m, j \neq c \\
0 & j=others
\end{cases}
$$
where $-m \leq j \leq m, j \neq 0$.
And $$\frac{\partial{J_{CBOW}}}{\partial{U}} = \frac{\partial{F(\boldsymbol{w_c, \hat{v}})}}{\partial{U}} $$

 



