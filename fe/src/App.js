import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

// CONTEXTS
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";

// COMPONENTS
import ToastContainer from "./Component/Toast/Toast";
import ProtectedRoute from "./Component/ProtectedRoute/ProtectedRoute";

// HOME PAGE SECTIONS
import Navbar from "./Component/Navbar/Navbar";
import Hero from "./Component/Hero/Hero";
import CompanyIntro from "./Component/CompanyIntro/CompanyIntro";
import Process from "./Component/Process/Process";
import Campaigns from "./Component/Campaigns/Campaigns";
import AgricultureBanner from "./Component/AgricultureBanner/AgricultureBanner";
import Footer from "./Component/Footer/Footer";

// PAGES
import Solutions from "./Component/Solutions/Solutions";
import Contact from "./Component/Contact/Contact";
import Auth from "./Component/Auth/Auth";
import Register from "./Component/Register/Register";

// DASHBOARDS
import EnterpriseDashboard from "./Component/EnterpriseDashboard/EnterpriseDashboard";
import FarmerDashboard from "./Component/FarmerDashboard/FarmerDashboard";

// PRODUCTS
import AllProducts from "./Component/AllProducts/AllProducts";
import ProductDetail from "./Component/ProductDetail/ProductDetail";

// ROLE-SPECIFIC HOME
import FarmerHome from "./Component/FarmerHome/FarmerHome";
import EnterpriseHome from "./Component/EnterpriseHome/EnterpriseHome";

// FEATURES
import Messaging from "./Component/Messaging/Messaging";
import ContractFlow from "./Component/ContractFlow/ContractFlow";
import Profile from "./Component/Profile/Profile";
import ResetPassword from "./Component/ResetPassword/ResetPassword";
import VerifyEmail from "./Component/VerifyEmail/VerifyEmail";
import PaymentResult from "./Component/PaymentResult/PaymentResult";

function HomePage() {
  const homeShowcaseStyle = {
    backgroundImage: `linear-gradient(180deg, rgba(6, 14, 10, 0.44) 0%, rgba(6, 14, 10, 0.58) 100%), url(${process.env.PUBLIC_URL}/BG1.jpg)`,
  };

  return (
    <>
      <Navbar />
      <Hero />
      <div className="home-showcase" style={homeShowcaseStyle}>
        <div className="home-showcase-overlay" />
        <div className="home-showcase-pattern" />
        <div className="home-showcase-content">
          <CompanyIntro />
          <Campaigns />
          <Process />
        </div>
      </div>
      <AgricultureBanner />
      <Footer />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Products */}
            <Route path="/products" element={<AllProducts />} />
            <Route path="/products/:id" element={<ProductDetail />} />

            {/* Enterprise (protected) */}
            <Route path="/enterprise" element={<ProtectedRoute allowedRoles={['enterprise']}><EnterpriseDashboard /></ProtectedRoute>} />
            <Route path="/enterprise-home" element={<ProtectedRoute allowedRoles={['enterprise']}><EnterpriseHome /></ProtectedRoute>} />

            {/* Farmer (protected) */}
            <Route path="/farmer" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/farmer-home" element={<ProtectedRoute allowedRoles={['farmer']}><FarmerHome /></ProtectedRoute>} />

            {/* Authenticated features (both roles) */}
            <Route path="/messaging" element={<ProtectedRoute allowedRoles={['farmer', 'enterprise']}><Messaging /></ProtectedRoute>} />
            <Route path="/contract-flow" element={<ProtectedRoute allowedRoles={['farmer', 'enterprise']}><ContractFlow /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute allowedRoles={['farmer', 'enterprise']}><Profile /></ProtectedRoute>} />

            {/* Payment return pages */}
            <Route path="/payment/success" element={<ProtectedRoute allowedRoles={['farmer', 'enterprise']}><PaymentResult type="success" /></ProtectedRoute>} />
            <Route path="/payment/cancel" element={<ProtectedRoute allowedRoles={['farmer', 'enterprise']}><PaymentResult type="cancel" /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
