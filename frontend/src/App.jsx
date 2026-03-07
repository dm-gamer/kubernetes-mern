import { useState, useEffect } from 'react'
import './App.css'

// Same origin: Ingress routes /api to backend
const API_BASE = '/api';

function App() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [token, setToken] = useState(null);
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [students, setStudents] = useState([]);
  const [studentForm, setStudentForm] = useState({ name: '', age: '', course: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const authenticated = Boolean(token);

  useEffect(() => {
    if (!authenticated) {
      document.body.classList.add('auth-mode');
    } else {
      document.body.classList.remove('auth-mode');
    }

    return () => {
      document.body.classList.remove('auth-mode');
    };
  }, [authenticated]);

  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleStudentChange = (e) => {
    const { name, value } = e.target;
    setStudentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/login' : '/register';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Request failed');
      }

      if (mode === 'register') {
        setMode('login');
      } else {
        setToken(data.token);
        setAuthForm({ email: '', password: '' });
        await fetchStudents(data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (activeToken = token) => {
    if (!activeToken) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/students`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load students');
      }
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: studentForm.name,
          age: Number(studentForm.age),
          course: studentForm.course,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add student');
      }
      setStudents((prev) => [data, ...prev]);
      setStudentForm({ name: '', age: '', course: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete student');
      }
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setStudents([]);
  };

  return (
    <div className={authenticated ? 'app app-dashboard' : 'app app-auth'}>
      <header className="app-header">
        <h1>Student Dashboard</h1>
        {authenticated && (
          <button className="secondary" onClick={handleLogout}>
            Logout
          </button>
        )}
      </header>

      {error && <div className="error">{error}</div>}

      {!authenticated ? (
        <div className="auth-layout">
          <div className="card auth-card">
            <div className="tabs">
              <button
                className={mode === 'login' ? 'tab active' : 'tab'}
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
              >
                Login
              </button>
              <button
                className={mode === 'register' ? 'tab active' : 'tab'}
                onClick={() => {
                  setMode('register');
                  setError('');
                }}
              >
                Register
              </button>
            </div>
            <form className="form" onSubmit={handleAuthSubmit}>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthChange}
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  minLength={6}
                  required
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <main className="dashboard">
          <section className="card">
            <h2>Add Student</h2>
            <form className="form" onSubmit={handleAddStudent}>
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={studentForm.name}
                  onChange={handleStudentChange}
                  required
                />
              </label>
              <label>
                Age
                <input
                  type="number"
                  name="age"
                  value={studentForm.age}
                  onChange={handleStudentChange}
                  required
                  min={1}
                />
              </label>
              <label>
                Course
                <input
                  type="text"
                  name="course"
                  value={studentForm.course}
                  onChange={handleStudentChange}
                  required
                />
              </label>
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Add Student'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="students-header">
              <h2>Students</h2>
              <button className="secondary" onClick={() => fetchStudents()}>
                Refresh
              </button>
            </div>
            {loading && students.length === 0 ? (
              <p>Loading students...</p>
            ) : students.length === 0 ? (
              <p>No students yet. Add one above.</p>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Age</th>
                    <th>Course</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id}>
                      <td>{s.name}</td>
                      <td>{s.age}</td>
                      <td>{s.course}</td>
                      <td>
                        <button
                          className="danger"
                          onClick={() => handleDeleteStudent(s._id)}
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      )}
    </div>
  )
}

export default App
