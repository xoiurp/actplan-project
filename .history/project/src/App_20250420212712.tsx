import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Orders from './pages/Orders';
import PaymentPlans from './pages/PaymentPlans';
import CreateOrder from './pages/CreateOrder';
import EditOrder from './pages/EditOrder';
import OrderDetails from './pages/OrderDetails';
import PaymentPlanDetails from './pages/PaymentPlanDetails';
import CreateBulkPaymentPlan from './pages/CreateBulkPaymentPlan';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/new" element={<CreateOrder />} />
            <Route path="orders/:id/edit" element={<EditOrder />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="payment-plans" element={<PaymentPlans />} />
            <Route path="payment-plans/bulk" element={<CreateBulkPaymentPlan />} />
            <Route path="payment-plans/:id" element={<PaymentPlanDetails />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}