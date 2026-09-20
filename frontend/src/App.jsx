import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Subjects from './pages/Subjects.jsx';
import Timetable from './pages/Timetable.jsx';
import Attendance from './pages/Attendance.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import AcademicCalendar from './pages/AcademicCalendar.jsx';
import Notifications from './pages/Notifications.jsx';
import Assistant from './pages/Assistant.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/academic-calendar" element={<AcademicCalendar />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
