import { Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleHome from './components/RoleHome'
import AppShell from './components/layout/AppShell'
import FleetShell from './components/layout/FleetShell'
import Login from './pages/Login'
import Register from './pages/Register'
import Tracking from './pages/Tracking'
import MapPage from './pages/Map'
import Loads from './pages/Loads'
import LoadDetail from './pages/LoadDetail'
import Alerts from './pages/Alerts'
import DriverHos from './pages/DriverHos'
import DriverHosLog from './pages/DriverHosLog'
import HosViolations from './pages/HosViolations'
import UnassignedHos from './pages/UnassignedHos'
import DriverQualification from './pages/DriverQualification'
import ComplianceOverview from './pages/ComplianceOverview'
import DispatchBoard from './pages/DispatchBoard'
import FleetDvir from './pages/FleetDvir'
import RoutePlanner from './pages/RoutePlanner'
import Documents from './pages/Documents'
import DispatchStatus from './pages/DispatchStatus'
import Settings from './pages/Settings'
import Drivers from './pages/Drivers'
import DriverDetail from './pages/DriverDetail'
import BrokerChat from './pages/BrokerChat'
import DriverChat from './pages/DriverChat'
import BrokerCheck from './pages/BrokerCheck'
import CashLedger from './pages/CashLedger'
import FleetDashboard from './pages/FleetDashboard'
import TruckMarket from './pages/TruckMarket'
import TruckListingDetail from './pages/TruckListingDetail'
import TruckDetail from './pages/TruckDetail'
import FleetMaintenance from './pages/FleetMaintenance'
import FleetAlerts from './pages/FleetAlerts'
import FleetDocuments from './pages/FleetDocuments'
import FleetSettings from './pages/FleetSettings'
import Pending from './pages/Pending'
import AdminShell from './components/layout/AdminShell'
import AdminUsers from './pages/AdminUsers'
import AdminInvites from './pages/AdminInvites'
import FinanceShell from './components/layout/FinanceShell'
import FinanceDashboard from './pages/FinanceDashboard'
import FinanceInvoices from './pages/FinanceInvoices'
import InvoiceDetail from './pages/InvoiceDetail'
import FinanceSettlements from './pages/FinanceSettlements'
import FinanceExpenses from './pages/FinanceExpenses'
import FinanceSettings from './pages/FinanceSettings'
import LoadBoard from './pages/LoadBoard'
import HrShell from './components/layout/HrShell'
import HrApplicants from './pages/HrApplicants'
import HrApplicantDetail from './pages/HrApplicantDetail'
import HrDrivers from './pages/HrDrivers'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending" element={<ProtectedRoute><Pending /></ProtectedRoute>} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleHome />} />
            <Route path="loads" element={<Loads />} />
            <Route path="loads/board" element={<DispatchBoard />} />
            <Route path="loads/:id" element={<LoadDetail />} />
            <Route path="load-board" element={<LoadBoard />} />
            <Route path="tracking" element={<Tracking />} />
            <Route path="map" element={<MapPage />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="drivers/:id" element={<DriverDetail />} />
            <Route path="broker-chat" element={<BrokerChat />} />
            <Route path="driver-chat" element={<DriverChat />} />
            <Route path="broker-check" element={<BrokerCheck />} />
            <Route path="cash" element={<CashLedger />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="documents" element={<Documents />} />
            <Route path="dispatch-status" element={<DispatchStatus />} />
            <Route path="compliance" element={<ComplianceOverview />} />
            <Route path="compliance/hos" element={<DriverHos />} />
            <Route path="compliance/hos/:driverId" element={<DriverHosLog />} />
            <Route path="compliance/violations" element={<HosViolations />} />
            <Route path="compliance/unassigned-hos" element={<UnassignedHos />} />
            <Route path="drivers/qualification" element={<DriverQualification />} />
            <Route path="routes" element={<RoutePlanner />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route
            path="/fleet"
            element={
              <ProtectedRoute allow={['fleet-manager']}>
                <FleetShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<FleetDashboard />} />
            <Route path="market" element={<TruckMarket />} />
            <Route path="market/:id" element={<TruckListingDetail />} />
            <Route path="trucks/:id" element={<TruckDetail />} />
            <Route path="maintenance" element={<FleetMaintenance />} />
            <Route path="dvir" element={<FleetDvir />} />
            <Route path="alerts" element={<FleetAlerts />} />
            <Route path="documents" element={<FleetDocuments />} />
            <Route path="settings" element={<FleetSettings />} />
          </Route>
          <Route
            path="/finance"
            element={
              <ProtectedRoute allow={['finance']}>
                <FinanceShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<FinanceDashboard />} />
            <Route path="invoices" element={<FinanceInvoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="settlements" element={<FinanceSettlements />} />
            <Route path="expenses" element={<FinanceExpenses />} />
            <Route path="cashflow" element={<CashLedger />} />
            <Route path="settings" element={<FinanceSettings />} />
          </Route>
          <Route
            path="/hr"
            element={
              <ProtectedRoute allow={['hr']}>
                <HrShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<HrApplicants />} />
            <Route path="applicants/:id" element={<HrApplicantDetail />} />
            <Route path="drivers" element={<HrDrivers />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminUsers />} />
            <Route path="invites" element={<AdminInvites />} />
          </Route>
        </Routes>
      </AuthProvider>
    </MotionConfig>
  )
}
