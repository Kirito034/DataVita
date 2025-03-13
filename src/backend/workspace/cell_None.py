import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

# Generate synthetic data
np.random.seed(42)
X = 2 * np.random.rand(100, 1)
y = 4 + 3 * X + np.random.randn(100, 1)  # Linear relationship with some noise

# Split data into training and test sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train Linear Regression model
model = LinearRegression()
model.fit(X_train, y_train)

# Predict values
X_pred = np.linspace(0, 2, 100).reshape(-1, 1)
y_pred = model.predict(X_pred)

# Plot data and regression line
plt.scatter(X, y, color='blue', label='Actual data')
plt.plot(X_pred, y_pred, color='red', linewidth=2, label='Regression line')
plt.xlabel("X")
plt.ylabel("y")
plt.title("Linear Regression using Matplotlib")
plt.legend()
plt.show()

# Print model coefficients
print(f"Slope (Coefficient): {model.coef_[0][0]:.2f}")
print(f"Intercept: {model.intercept_[0]:.2f}")
