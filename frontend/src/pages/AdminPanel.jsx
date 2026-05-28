import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers, faNetworkWired, faPlus, faEdit, faTrash,
  faSignOutAlt, faTachometerAlt, faShieldAlt, faCheck,
  faTimes, faEye, faEyeSlash, faToggleOn, faToggleOff,
  faSearch, faMoon, faSun, faFileExcel, faFileImport,
  faDownload, faSpinner,
} from '@fortawesome/free-solid-svg-icons';

const API = 'http://localhost:3000';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition
      ${type === 'success' ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
      <FontAwesomeIcon icon={type === 'success' ? faCheck : faTimes} />
      {message}
    </div>
  );
};

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-gray-800 rounded-2xl p-6 w-80 shadow-xl">
      <p className="text-gray-200 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
          Annuler
        </button>
        <button onClick={onConfirm}
          className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition">
          Supprimer
        </button>
      </div>
    </div>
  </div>
);

// ─── User Modal ───────────────────────────────────────────────────────────────
const UserModal = ({ user, onClose, onSave, token }) => {
  const isEdit = !!user?.id;
  const [form, setForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'operator',
    is_active: user?.is_active ?? true,
    password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const body = { ...form };
    if (isEdit && !body.password) delete body.password;

    try {
      const res = await fetch(`${API}/api/admin/users${isEdit ? `/${user.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Erreur'); return; }
      onSave(data.data, isEdit);
    } catch {
      setError('Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-sm">
            {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nom d'utilisateur</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Rôle</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition">
                <option value="operator">Opérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Mot de passe {isEdit && <span className="text-gray-500">(laisser vide pour ne pas changer)</span>}
            </label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={form.password}
                onChange={e => set('password', e.target.value)}
                required={!isEdit}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 pr-9 py-2 text-sm focus:outline-none focus:border-blue-500 transition" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition">
                <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} className="text-xs" />
              </button>
            </div>
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('is_active', !form.is_active)}
                className={`text-xl transition ${form.is_active ? 'text-green-400' : 'text-gray-500'}`}>
                <FontAwesomeIcon icon={form.is_active ? faToggleOn : faToggleOff} />
              </button>
              <span className="text-sm text-gray-300">
                Compte {form.is_active ? 'actif' : 'désactivé'}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Equipment Modal ──────────────────────────────────────────────────────────
const EquipementModal = ({ equip, onClose, onSave, token }) => {
  const isEdit = !!equip?.id;
  const [form, setForm] = useState({
    name: equip?.name || '',
    ip: equip?.ip || '',
    type: equip?.type || 'Camera',
    location: equip?.location || '',
    description: equip?.description || '',
    active: equip?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/admin/equipements${isEdit ? `/${equip.id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Erreur'); return; }
      onSave(data.data, isEdit);
    } catch {
      setError('Impossible de joindre le serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-sm">
            {isEdit ? 'Modifier l\'équipement' : 'Nouvel équipement'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nom</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                placeholder="Camera 01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Adresse IP</label>
              <input value={form.ip} onChange={e => set('ip', e.target.value)} required
                pattern="^(\d{1,3}\.){3}\d{1,3}$"
                title="Format: 192.168.1.1"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                placeholder="10.136.115.60" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition">
                <option value="Camera">Caméra</option>
                <option value="Server">Serveur</option>
                <option value="Switch">Switch</option>
                <option value="Router">Routeur</option>
                <option value="NVR">NVR</option>
                <option value="Other">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Localisation</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                placeholder="Bâtiment A" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition resize-none"
              placeholder="Description optionnelle..." />
          </div>

          {isEdit && (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => set('active', !form.active)}
                className={`text-xl transition ${form.active ? 'text-green-400' : 'text-gray-500'}`}>
                <FontAwesomeIcon icon={form.active ? faToggleOn : faToggleOff} />
              </button>
              <span className="text-sm text-gray-300">
                Équipement {form.active ? 'actif' : 'inactif'}
              </span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Ajouter')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
const AdminPanel = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('cibestDarkMode') === 'true'
  );

  // Data
  const [users, setUsers] = useState([]);
  const [equipements, setEquipements] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Search
  const [userSearch, setUserSearch] = useState('');
  const [equipSearch, setEquipSearch] = useState('');

  // Import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { added, skipped, errors[] }

  // Modals
  const [userModal, setUserModal] = useState(null);    // null | 'add' | user object
  const [equipModal, setEquipModal] = useState(null);  // null | 'add' | equip object
  const [confirm, setConfirm] = useState(null);        // null | { message, onConfirm }

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Fetch ──
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) { logout(); navigate('/login'); return; }
      if (data.success) setUsers(data.data);
    } catch {
      showToast('Erreur lors du chargement des utilisateurs', 'error');
    }
  }, [token, logout, navigate]);

  const fetchEquipements = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/equipements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) { logout(); navigate('/login'); return; }
      if (data.success) setEquipements(data.data);
    } catch {
      showToast('Erreur lors du chargement des équipements', 'error');
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    setLoadingData(true);
    Promise.all([fetchUsers(), fetchEquipements()]).finally(() => setLoadingData(false));
  }, [token, fetchUsers, fetchEquipements, navigate]);

  useEffect(() => {
    localStorage.setItem('cibestDarkMode', darkMode);
  }, [darkMode]);

  // ── User handlers ──
  const handleUserSave = (saved, isEdit) => {
    setUsers(prev => isEdit
      ? prev.map(u => u.id === saved.id ? saved : u)
      : [saved, ...prev]
    );
    setUserModal(null);
    showToast(isEdit ? 'Utilisateur modifié' : 'Utilisateur créé');
  };

  const handleDeleteUser = (id, username) => {
    setConfirm({
      message: `Supprimer l'utilisateur "${username}" ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API}/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok || !data.success) { showToast(data.error || 'Erreur', 'error'); return; }
          setUsers(prev => prev.filter(u => u.id !== id));
          showToast('Utilisateur supprimé');
        } catch {
          showToast('Erreur serveur', 'error');
        }
      },
    });
  };

  // ── Equipment handlers ──
  const handleEquipSave = (saved, isEdit) => {
    setEquipements(prev => isEdit
      ? prev.map(e => e.id === saved.id ? saved : e)
      : [saved, ...prev]
    );
    setEquipModal(null);
    showToast(isEdit ? 'Équipement modifié' : 'Équipement ajouté');
  };

  const handleDeleteEquip = (id, name) => {
    setConfirm({
      message: `Supprimer l'équipement "${name}" ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          const res = await fetch(`${API}/api/admin/equipements/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok || !data.success) { showToast(data.error || 'Erreur', 'error'); return; }
          setEquipements(prev => prev.filter(e => e.id !== id));
          showToast('Équipement supprimé');
        } catch {
          showToast('Erreur serveur', 'error');
        }
      },
    });
  };

  // ── Excel handlers ──
  const handleExport = () => {
    const a = document.createElement('a');
    a.href = `${API}/api/admin/equipements/export`;
    a.setAttribute('Authorization', `Bearer ${token}`);
    // Use fetch to trigger download with auth header
    fetch(`${API}/api/admin/equipements/export`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = 'equipements_export.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Erreur lors de l\'export', 'error'));
  };

  const handleTemplate = () => {
    fetch(`${API}/api/admin/equipements/template`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'modele_equipements.xlsx';
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Erreur lors du téléchargement', 'error'));
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/api/admin/equipements/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) { showToast(data.error || 'Erreur import', 'error'); return; }
      setImportResult(data);
      fetchEquipements();
    } catch {
      showToast('Erreur lors de l\'import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── Filtered lists ──
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredEquipements = equipements.filter(e =>
    e.name.toLowerCase().includes(equipSearch.toLowerCase()) ||
    e.ip.includes(equipSearch)
  );

  const bg = darkMode ? 'bg-gray-900' : 'bg-gray-100';
  const card = darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const text = darkMode ? 'text-gray-200' : 'text-gray-800';
  const subtext = darkMode ? 'text-gray-400' : 'text-gray-500';
  const tableHead = darkMode ? 'bg-gray-750 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200';
  const tableRow = darkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50';
  const inputClass = darkMode
    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400';

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-200`}>
      {/* ── Topbar ── */}
      <div className={`${card} border-b px-6 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FontAwesomeIcon icon={faShieldAlt} className="text-white text-sm" />
          </div>
          <div>
            <h1 className={`font-bold text-sm ${text}`}>Panel Admin — Cibest</h1>
            <p className={`text-xs ${subtext}`}>Connecté en tant que <span className="font-medium text-blue-400">{user?.username}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/cibest')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <FontAwesomeIcon icon={faTachometerAlt} />
            Dashboard
          </button>
          <button onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg text-xs transition ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-600'}`}>
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-medium transition">
            <FontAwesomeIcon icon={faSignOutAlt} />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Utilisateurs', value: users.length, icon: faUsers, color: 'blue' },
            { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: faShieldAlt, color: 'purple' },
            { label: 'Équipements', value: equipements.length, icon: faNetworkWired, color: 'green' },
            { label: 'Actifs', value: equipements.filter(e => e.active).length, icon: faCheck, color: 'emerald' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className={`${card} border rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${subtext}`}>{label}</p>
                  <p className={`text-2xl font-bold mt-1 ${text}`}>{loadingData ? '—' : value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-500/20`}>
                  <FontAwesomeIcon icon={icon} className={`text-${color}-400`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className={`${card} border rounded-2xl overflow-hidden`}>
          <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            {[
              { key: 'users', label: 'Utilisateurs', icon: faUsers },
              { key: 'equipements', label: 'Équipements', icon: faNetworkWired },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition border-b-2
                  ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : `border-transparent ${subtext} hover:${text}`}`}>
                <FontAwesomeIcon icon={tab.icon} className="text-xs" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── Users Tab ── */}
            {activeTab === 'users' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="relative">
                    <FontAwesomeIcon icon={faSearch}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${subtext}`} />
                    <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className={`${inputClass} border rounded-lg pl-8 pr-4 py-2 text-sm w-56 focus:outline-none focus:border-blue-500 transition`} />
                  </div>
                  <button onClick={() => setUserModal('add')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                    Nouvel utilisateur
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${tableHead} border-b text-xs uppercase tracking-wider`}>
                        <th className="px-4 py-3 text-left">Utilisateur</th>
                        <th className="px-4 py-3 text-left">Email</th>
                        <th className="px-4 py-3 text-left">Rôle</th>
                        <th className="px-4 py-3 text-left">Statut</th>
                        <th className="px-4 py-3 text-left">Dernière connexion</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={`px-4 py-8 text-center text-sm ${subtext}`}>
                            {loadingData ? 'Chargement...' : 'Aucun utilisateur trouvé'}
                          </td>
                        </tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u.id} className={`${tableRow} border-b transition`}>
                          <td className={`px-4 py-3 font-medium ${text}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-xs text-blue-400 font-bold">
                                {u.username[0].toUpperCase()}
                              </div>
                              {u.username}
                            </div>
                          </td>
                          <td className={`px-4 py-3 ${subtext}`}>{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                              ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                              {u.role === 'admin' ? 'Admin' : 'Opérateur'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                              ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-400' : 'bg-gray-400'}`} />
                              {u.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${subtext}`}>
                            {u.last_login
                              ? new Date(u.last_login).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setUserModal(u)}
                                className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition`}
                                title="Modifier">
                                <FontAwesomeIcon icon={faEdit} className="text-xs" />
                              </button>
                              <button onClick={() => handleDeleteUser(u.id, u.username)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                                title="Supprimer">
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── Equipements Tab ── */}
            {activeTab === 'equipements' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="relative">
                    <FontAwesomeIcon icon={faSearch}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${subtext}`} />
                    <input value={equipSearch} onChange={e => setEquipSearch(e.target.value)}
                      placeholder="Rechercher par nom ou IP..."
                      className={`${inputClass} border rounded-lg pl-8 pr-4 py-2 text-sm w-56 focus:outline-none focus:border-blue-500 transition`} />
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Template download */}
                    <button onClick={handleTemplate}
                      title="Télécharger le fichier modèle"
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium transition
                        ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <FontAwesomeIcon icon={faDownload} />
                      Modèle
                    </button>
                    {/* Export */}
                    <button onClick={handleExport}
                      title="Exporter tous les équipements"
                      className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition">
                      <FontAwesomeIcon icon={faFileExcel} />
                      Exporter
                    </button>
                    {/* Import */}
                    <label className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg font-medium cursor-pointer transition
                      ${importing ? 'bg-yellow-600/20 text-yellow-400' : 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'}`}>
                      <FontAwesomeIcon icon={importing ? faSpinner : faFileImport} spin={importing} />
                      {importing ? 'Import...' : 'Importer'}
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
                    </label>
                    {/* Add */}
                    <button onClick={() => setEquipModal('add')}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium transition">
                      <FontAwesomeIcon icon={faPlus} />
                      Nouveau
                    </button>
                  </div>
                </div>

                {/* Import result banner */}
                {importResult && (
                  <div className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 mb-4 text-xs
                    ${importResult.added > 0 ? 'bg-green-900/30 border border-green-700' : 'bg-yellow-900/30 border border-yellow-700'}`}>
                    <div>
                      <p className="font-semibold text-green-400 mb-1">
                        Import terminé — {importResult.added} ajouté(s), {importResult.skipped} ignoré(s)
                      </p>
                      {importResult.errors.length > 0 && (
                        <ul className="text-yellow-400 space-y-0.5">
                          {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                        </ul>
                      )}
                    </div>
                    <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-white mt-0.5">
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                )}


                <div className="overflow-x-auto rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`${tableHead} border-b text-xs uppercase tracking-wider`}>
                        <th className="px-4 py-3 text-left">Nom</th>
                        <th className="px-4 py-3 text-left">IP</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-left">Localisation</th>
                        <th className="px-4 py-3 text-left">Statut</th>
                        <th className="px-4 py-3 text-left">Ajouté le</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEquipements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={`px-4 py-8 text-center text-sm ${subtext}`}>
                            {loadingData ? 'Chargement...' : 'Aucun équipement trouvé'}
                          </td>
                        </tr>
                      ) : filteredEquipements.map(e => (
                        <tr key={e.id} className={`${tableRow} border-b transition`}>
                          <td className={`px-4 py-3 font-medium ${text}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-green-600/30 flex items-center justify-center">
                                <FontAwesomeIcon icon={faNetworkWired} className="text-green-400 text-xs" />
                              </div>
                              {e.name}
                            </div>
                          </td>
                          <td className={`px-4 py-3 font-mono text-xs ${subtext}`}>{e.ip}</td>
                          <td className={`px-4 py-3 ${subtext}`}>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                              {e.type}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${subtext}`}>{e.location || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium
                              ${e.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${e.active ? 'bg-green-400' : 'bg-gray-400'}`} />
                              {e.active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-xs ${subtext}`}>
                            {new Date(e.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEquipModal(e)}
                                className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-100 text-gray-500'} transition`}
                                title="Modifier">
                                <FontAwesomeIcon icon={faEdit} className="text-xs" />
                              </button>
                              <button onClick={() => handleDeleteEquip(e.id, e.name)}
                                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                                title="Supprimer">
                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {(userModal === 'add' || userModal?.id) && (
        <UserModal
          user={userModal === 'add' ? null : userModal}
          token={token}
          onClose={() => setUserModal(null)}
          onSave={handleUserSave}
        />
      )}

      {(equipModal === 'add' || equipModal?.id) && (
        <EquipementModal
          equip={equipModal === 'add' ? null : equipModal}
          token={token}
          onClose={() => setEquipModal(null)}
          onSave={handleEquipSave}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
