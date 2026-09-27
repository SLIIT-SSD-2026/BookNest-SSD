import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requiredRole }) {
  const userData = localStorage.getItem('user');

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const user = JSON.parse(userData);
    if (user.role !== requiredRole) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
