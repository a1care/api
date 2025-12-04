import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import DoctorManagement from './pages/DoctorManagement';
import ServiceManagement from './pages/ServiceManagement';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div className="flex h-screen bg-background overflow-hidden">
                {/* Sidebar - Fixed */}
                <Sidebar />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col ml-64 overflow-hidden">
                  {/* Header */}
                  <Header />

                  {/* Page Content - Scrollable */}
                  <main className="flex-1 overflow-y-auto p-6">
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/users" element={<UserManagement />} />
                      <Route path="/doctors" element={<DoctorManagement />} />
                      <Route path="/services" element={<ServiceManagement />} />
                      <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
