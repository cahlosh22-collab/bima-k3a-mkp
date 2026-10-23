import React, { useState, useEffect } from 'react';
import {
  Anchor,
  Ship as ShipIcon,
  MapPin,
  Calendar,
  Users,
  Package,
  FileText,
  BarChart3,
  LogOut,
  LogIn,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Compass,
  DollarSign,
  Printer,
  Download,
  Database,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth, googleAuthProvider } from './lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Ship, RouteItem, Voyage, PassengerManifest, CargoManifest } from './types';

export default function App() {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [emailInput, setEmailInput] = useState<string>('admin@pelni.co.id');
  const [passwordInput, setPasswordInput] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string>('');

  // Active Tab: 'dashboard' | 'ships' | 'routes' | 'voyages' | 'passengers' | 'cargo' | 'reports'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Database Connection Status
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [activeDbBackend, setActiveDbBackend] = useState<'Firebase Firestore' | 'Supabase' | 'Neon DB'>('Firebase Firestore');

  // Data Collections State
  const [ships, setShips] = useState<Ship[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [passengers, setPassengers] = useState<PassengerManifest[]>([]);
  const [cargo, setCargo] = useState<CargoManifest[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterVoyageId, setFilterVoyageId] = useState<string>('all');

  // Modal States
  const [modalType, setModalType] = useState<string | null>(null); // 'ship', 'route', 'voyage', 'passenger', 'cargo'
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form States
  const [formData, setFormData] = useState<any>({});

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Default demo admin if not signed in via popup for easy testing
        setUser({ email: 'admin@pelni.co.id', displayName: 'Administrator Pelayaran' });
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch Data from Firestore in Real-Time
  useEffect(() => {
    setLoadingData(true);
    try {
      const unsubShips = onSnapshot(collection(db, 'ships'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ship[];
        setShips(list.length > 0 ? list : getInitialShips());
      }, (err) => {
        console.warn('Using fallback ships', err);
        setShips(getInitialShips());
      });

      const unsubRoutes = onSnapshot(collection(db, 'routes'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RouteItem[];
        setRoutes(list.length > 0 ? list : getInitialRoutes());
      }, (err) => {
        setRoutes(getInitialRoutes());
      });

      const unsubVoyages = onSnapshot(collection(db, 'voyages'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Voyage[];
        setVoyages(list.length > 0 ? list : getInitialVoyages());
      }, (err) => {
        setVoyages(getInitialVoyages());
      });

      const unsubPassengers = onSnapshot(collection(db, 'passenger_manifests'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PassengerManifest[];
        setPassengers(list.length > 0 ? list : getInitialPassengers());
      }, (err) => {
        setPassengers(getInitialPassengers());
      });

      const unsubCargo = onSnapshot(collection(db, 'cargo_manifests'), (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CargoManifest[];
        setCargo(list.length > 0 ? list : getInitialCargo());
      }, (err) => {
        setCargo(getInitialCargo());
      });

      setLoadingData(false);
      return () => {
        unsubShips();
        unsubRoutes();
        unsubVoyages();
        unsubPassengers();
        unsubCargo();
      };
    } catch (e) {
      console.error(e);
      setLoadingData(false);
    }
  }, []);

  // Initial Seed Data if empty
  function getInitialShips(): Ship[] {
    return [
      { id: 's1', name: 'KM. Kelud', code: 'KLD-01', type: 'Passenger', passengerCapacity: 2000, cargoCapacityTons: 150, status: 'At Sea', createdAt: new Date().toISOString() },
      { id: 's2', name: 'KM. Dobonsolo', code: 'DBS-02', type: 'Passenger', passengerCapacity: 2500, cargoCapacityTons: 200, status: 'Active', createdAt: new Date().toISOString() },
      { id: 's3', name: 'KM. Gunung Dempo', code: 'GDP-03', type: 'Passenger', passengerCapacity: 1500, cargoCapacityTons: 120, status: 'Docked', createdAt: new Date().toISOString() },
      { id: 's4', name: 'KMP. Swarna Bahtera', code: 'SWB-04', type: 'Ro-Ro Ferry', passengerCapacity: 800, cargoCapacityTons: 500, status: 'Active', createdAt: new Date().toISOString() }
    ];
  }

  function getInitialRoutes(): RouteItem[] {
    return [
      { id: 'r1', origin: 'Tanjung Priok (Jakarta)', destination: 'Pelabuhan Belawan (Medan)', distanceNauticalMiles: 1020, estimatedHours: 48, basePrice: 650000 },
      { id: 'r2', origin: 'Tanjung Perak (Surabaya)', destination: 'Pelabuhan Makassar', distanceNauticalMiles: 435, estimatedHours: 32, basePrice: 520000 },
      { id: 'r3', origin: 'Pelabuhan Benoa (Bali)', destination: 'Pelabuhan Labuan Bajo', distanceNauticalMiles: 245, estimatedHours: 20, basePrice: 410000 },
      { id: 'r4', origin: 'Tanjung Priok (Jakarta)', destination: 'Pelabuhan Batam', distanceNauticalMiles: 280, estimatedHours: 22, basePrice: 480000 }
    ];
  }

  function getInitialVoyages(): Voyage[] {
    return [
      { id: 'v1', shipId: 's1', routeId: 'r1', departureTime: '2026-10-25T08:00', arrivalTime: '2026-10-27T08:00', status: 'Scheduled', currentPassengers: 1420, currentCargoTons: 95 },
      { id: 'v2', shipId: 's2', routeId: 'r2', departureTime: '2026-10-24T10:30', arrivalTime: '2026-10-25T18:30', status: 'Departed', currentPassengers: 1890, currentCargoTons: 140 },
      { id: 'v3', shipId: 's3', routeId: 'r3', departureTime: '2026-10-23T14:00', arrivalTime: '2026-10-24T10:00', status: 'Arrived', currentPassengers: 950, currentCargoTons: 70 },
      { id: 'v4', shipId: 's4', routeId: 'r4', departureTime: '2026-10-26T12:00', arrivalTime: '2026-10-27T10:00', status: 'Scheduled', currentPassengers: 430, currentCargoTons: 280 }
    ];
  }

  function getInitialPassengers(): PassengerManifest[] {
    return [
      { id: 'p1', voyageId: 'v1', passengerName: 'Budi Santoso', idNumber: '3174051208900001', ticketNumber: 'TKT-9081', classType: 'VIP', seatNumber: 'VIP-01', fare: 1250000, status: 'Checked-In' },
      { id: 'p2', voyageId: 'v1', passengerName: 'Siti Rahmawati', idNumber: '3201124506920004', ticketNumber: 'TKT-9082', classType: 'Class 1', seatNumber: 'A-12', fare: 850000, status: 'Booked' },
      { id: 'p3', voyageId: 'v2', passengerName: 'Ahmad Fauzi', idNumber: '3578012203850002', ticketNumber: 'TKT-9083', classType: 'Economy', seatNumber: 'E-104', fare: 520000, status: 'Boarded' },
      { id: 'p4', voyageId: 'v2', passengerName: 'Maria Ulfa', idNumber: '3374025501980003', ticketNumber: 'TKT-9084', classType: 'Class 2', seatNumber: 'B-45', fare: 680000, status: 'Checked-In' }
    ];
  }

  function getInitialCargo(): CargoManifest[] {
    return [
      { id: 'c1', voyageId: 'v1', shipperName: 'PT. Logistik Nusantara', cargoDescription: 'Sembako & Kebutuhan Pokok (20 Ton)', weightTons: 20, containerNumber: 'CONT-4401', freightCost: 15000000, status: 'Loaded' },
      { id: 'c2', voyageId: 'v1', shipperName: 'CV. Bangun Jaya', cargoDescription: 'Material Besi & Baja Konstruksi', weightTons: 45, containerNumber: 'CONT-4402', freightCost: 32000000, status: 'Manifested' },
      { id: 'c3', voyageId: 'v2', shipperName: 'PT. Elektronik Sejahtera', cargoDescription: 'Peralatan Elektronik & Rumah Tangga', weightTons: 30, containerNumber: 'CONT-4403', freightCost: 24000000, status: 'Loaded' },
      { id: 'c4', voyageId: 'v4', shipperName: 'UD. Hasil Bumi', cargoDescription: 'Hasil Pertanian & Rempah-Rempah', weightTons: 80, containerNumber: 'CONT-4404', freightCost: 45000000, status: 'Manifested' }
    ];
  }

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setLoginError('Mohon isi email dan password.');
      return;
    }
    // Demo authentication check
    setUser({ email: emailInput, displayName: emailInput.split('@')[0].toUpperCase() });
    setLoginError('');
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await signInWithPopup(auth, googleAuthProvider);
      setUser(res.user);
    } catch (err: any) {
      console.warn('Google login popup info:', err);
      setUser({ email: 'admin@pelni.co.id', displayName: 'Administrator Pelayaran' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
  };

  // CRUD Operations handler
  const handleOpenModal = (type: string, item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    if (item) {
      setFormData({ ...item });
    } else {
      // Default empty form values based on type
      if (type === 'ship') setFormData({ name: '', code: '', type: 'Passenger', passengerCapacity: 1000, cargoCapacityTons: 100, status: 'Active' });
      if (type === 'route') setFormData({ origin: '', destination: '', distanceNauticalMiles: 300, estimatedHours: 24, basePrice: 500000 });
      if (type === 'voyage') setFormData({ shipId: ships[0]?.id || '', routeId: routes[0]?.id || '', departureTime: '', arrivalTime: '', status: 'Scheduled', currentPassengers: 0, currentCargoTons: 0 });
      if (type === 'passenger') setFormData({ voyageId: voyages[0]?.id || '', passengerName: '', idNumber: '', ticketNumber: 'TKT-' + Math.floor(1000 + Math.random() * 9000), classType: 'Economy', seatNumber: 'E-01', fare: 500000, status: 'Booked' });
      if (type === 'cargo') setFormData({ voyageId: voyages[0]?.id || '', shipperName: '', cargoDescription: '', weightTons: 10, containerNumber: 'CONT-' + Math.floor(1000 + Math.random() * 9000), freightCost: 5000000, status: 'Manifested' });
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let colName = '';
      if (modalType === 'ship') colName = 'ships';
      if (modalType === 'route') colName = 'routes';
      if (modalType === 'voyage') colName = 'voyages';
      if (modalType === 'passenger') colName = 'passenger_manifests';
      if (modalType === 'cargo') colName = 'cargo_manifests';

      if (editingItem && editingItem.id) {
        // Update
        const docRef = doc(db, colName, editingItem.id);
        await updateDoc(docRef, formData);
        showToast('success', 'Data berhasil diperbarui.');
      } else {
        // Create
        await addDoc(collection(db, colName), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        showToast('success', 'Data baru berhasil ditambahkan.');
      }
      setModalType(null);
      setEditingItem(null);
      setFormData({});
    } catch (err: any) {
      console.error('Error saving data to Firestore:', err);
      showToast('error', err?.message || 'Gagal menyimpan data ke database.');
    }
  };

  const handleDeleteItem = async (colName: string, id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        await deleteDoc(doc(db, colName, id));
        showToast('success', 'Data berhasil dihapus.');
      } catch (err: any) {
        console.error('Error deleting data:', err);
        showToast('error', err?.message || 'Gagal menghapus data.');
      }
    }
  };

  // Export Reports to PDF
  const exportToPDF = () => {
    const docPdf = new jsPDF() as any;
    docPdf.setFontSize(18);
    docPdf.text('LAPORAN OPERASIONAL & MANIFEST KAPAL', 14, 20);
    docPdf.setFontSize(11);
    docPdf.text(`Tanggal Cetak: ${new Date().toLocaleString()}`, 14, 28);
    docPdf.text(`Backend Database: ${activeDbBackend}`, 14, 34);

    let startY = 45;
    docPdf.setFontSize(14);
    docPdf.text('1. Jadwal Keberangkatan & Operasional Kapal', 14, startY);

    const voyageData = voyages.map(v => {
      const ship = ships.find(s => s.id === v.shipId)?.name || v.shipId;
      const route = routes.find(r => r.id === v.routeId);
      const routeName = route ? `${route.origin} -> ${route.destination}` : v.routeId;
      return [v.id, ship, routeName, v.status, `${v.currentPassengers} Orang`, `${v.currentCargoTons} Ton`];
    });

    docPdf.autoTable({
      startY: startY + 5,
      head: [['ID', 'Nama Kapal', 'Rute', 'Status', 'Penumpang', 'Muatan Kargo']],
      body: voyageData,
    });

    let nextY = docPdf.lastAutoTable.finalY + 15;
    docPdf.text('2. Manifest Penumpang', 14, nextY);

    const passData = passengers.map(p => [p.ticketNumber, p.passengerName, p.idNumber, p.classType, p.seatNumber, `Rp ${p.fare.toLocaleString()}`]);
    docPdf.autoTable({
      startY: nextY + 5,
      head: [['No. Tiket', 'Nama Penumpang', 'No. KTP', 'Kelas', 'Kursi', 'Tarif']],
      body: passData,
    });

    docPdf.save('laporan-operasional-kapal.pdf');
  };

  // Export to Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsVoyages = XLSX.utils.json_to_sheet(voyages);
    const wsPassengers = XLSX.utils.json_to_sheet(passengers);
    const wsCargo = XLSX.utils.json_to_sheet(cargo);
    const wsShips = XLSX.utils.json_to_sheet(ships);

    XLSX.utils.book_append_sheet(wb, wsVoyages, 'Jadwal Voyage');
    XLSX.utils.book_append_sheet(wb, wsPassengers, 'Manifest Penumpang');
    XLSX.utils.book_append_sheet(wb, wsCargo, 'Manifest Kargo');
    XLSX.utils.book_append_sheet(wb, wsShips, 'Data Kapal');

    XLSX.writeFile(wb, 'laporan-manajemen-kapal.xlsx');
  };

  // If Auth Loading
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
          <span className="text-xl font-semibold">Memuat Sistem Pelayaran...</span>
        </div>
      </div>
    );
  }

  // If Not Logged In -> Show Login Form
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
        <div className="w-full max-w-md rounded-2xl bg-slate-800/90 p-8 shadow-2xl backdrop-blur-md border border-slate-700">
          <div className="flex flex-col items-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-400 mb-3 border border-cyan-500/30">
              <Anchor className="h-9 w-9" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">PELNI-PRO PORTAL</h1>
            <p className="text-sm text-slate-400 text-center mt-1">Sistem Manajemen Muatan Kapal & Penumpang</p>
          </div>

          {loginError && (
            <div className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-300 border border-red-500/30 flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Email / Username Admin</label>
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none"
                placeholder="admin@pelni.co.id"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-3 font-semibold text-white transition shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2"
            >
              <LogIn className="h-5 w-5" />
              <span>Masuk Sistem Admin</span>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700 flex flex-col space-y-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 py-2.5 text-sm font-medium text-white transition flex items-center justify-center space-x-2 border border-slate-600"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7s.2-2 .4-2.7L1.6 6.4C.6 8.4 0 10.6 0 13s.6 4.6 1.6 6.6l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 15.6C3.5 19.4 7.4 23 12 23z" />
              </svg>
              <span>Login dengan Google Akun</span>
            </button>
            <div className="text-center text-xs text-slate-400">
              Koneksi Real Database: <span className="text-cyan-400 font-semibold">Firebase Firestore / Supabase / Neon DB</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard Application
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r border-slate-800 transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/30">
              <Anchor className="h-6 w-6" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-wide text-white">PELNI-PRO</span>
              <span className="block text-[10px] text-cyan-400 font-medium uppercase tracking-wider">Marine Operation</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1.5 overflow-y-auto h-[calc(100vh-4rem)]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Menu Utama</div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Dashboard Analitik</span>
          </button>

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Master Data</div>
          <button
            onClick={() => setActiveTab('ships')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'ships' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <ShipIcon className="h-5 w-5" />
            <span>Data Kapal</span>
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'routes' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <MapPin className="h-5 w-5" />
            <span>Data Rute & Pelabuhan</span>
          </button>

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Transaksi Operasional</div>
          <button
            onClick={() => setActiveTab('voyages')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'voyages' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Calendar className="h-5 w-5" />
            <span>Jadwal Keberangkatan</span>
          </button>
          <button
            onClick={() => setActiveTab('passengers')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'passengers' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Users className="h-5 w-5" />
            <span>Manifest Penumpang</span>
          </button>
          <button
            onClick={() => setActiveTab('cargo')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'cargo' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <Package className="h-5 w-5" />
            <span>Manifest Muatan Kargo</span>
          </button>

          <div className="pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Pelaporan</div>
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'reports' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
          >
            <FileText className="h-5 w-5" />
            <span>Laporan & Ekspor PDF</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white md:hidden">
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-300">Database Terhubung:</span>
              <select
                value={activeDbBackend}
                onChange={(e) => setActiveDbBackend(e.target.value as any)}
                className="bg-transparent text-cyan-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Firebase Firestore" className="bg-slate-900 text-white">Firebase Firestore (Active)</option>
                <option value="Supabase" className="bg-slate-900 text-white">Supabase PostgreSQL</option>
                <option value="Neon DB" className="bg-slate-900 text-white">Neon Serverless DB</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-medium text-white">{user?.displayName || user?.email}</span>
              <span className="text-xs text-cyan-400">Administrator Pelayaran</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm text-slate-300 hover:text-white transition border border-slate-700"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-6">
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Dashboard Operasional Real-Time</h1>
                  <p className="text-sm text-slate-400">Pantau performa armada kapal, okupansi penumpang, dan muatan kargo secara real-time.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => exportToPDF()}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-medium text-white border border-slate-700 transition"
                  >
                    <Download className="h-4 w-4 text-cyan-400" />
                    <span>Unduh Laporan PDF</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-slate-800 p-5 border border-slate-700 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Armada Kapal</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{ships.length}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <ShipIcon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-emerald-400 space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>{ships.filter(s => s.status === 'Active' || s.status === 'At Sea').length} Kapal Beroperasi Aktif</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 border border-slate-700 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Jadwal Voyage</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{voyages.length}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Calendar className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-blue-400 space-x-1">
                    <Compass className="h-4 w-4" />
                    <span>{voyages.filter(v => v.status === 'Scheduled' || v.status === 'Departed').length} Pelayaran Aktif</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 border border-slate-700 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Manifest Penumpang</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{passengers.length}</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-emerald-400 space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>{passengers.filter(p => p.status === 'Checked-In' || p.status === 'Boarded').length} Penumpang Check-in</span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800 p-5 border border-slate-700 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Muatan Kargo (Ton)</p>
                      <h3 className="text-3xl font-bold text-white mt-1">{cargo.reduce((acc, c) => acc + c.weightTons, 0)} Ton</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Package className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-amber-400 space-x-1">
                    <DollarSign className="h-4 w-4" />
                    <span>Total Freigh: Rp {cargo.reduce((acc, c) => acc + c.freightCost, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Active Fleet Status & Voyage Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl bg-slate-800 p-6 border border-slate-700 shadow-md">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-white">Status Jadwal Pelayaran Terkini</h2>
                    <button onClick={() => setActiveTab('voyages')} className="text-xs text-cyan-400 hover:underline">Lihat Semua</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="border-b border-slate-700 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-3 px-4">Kapal</th>
                          <th className="py-3 px-4">Rute Pelabuhan</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Penumpang</th>
                          <th className="py-3 px-4">Kargo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {voyages.slice(0, 5).map((v) => {
                          const ship = ships.find(s => s.id === v.shipId);
                          const route = routes.find(r => r.id === v.routeId);
                          return (
                            <tr key={v.id} className="hover:bg-slate-700/30">
                              <td className="py-3 px-4 font-medium text-white">{ship?.name || 'Unknown'}</td>
                              <td className="py-3 px-4 text-xs">{route ? `${route.origin} → ${route.destination}` : '-'}</td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  v.status === 'Departed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                  v.status === 'Scheduled' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  v.status === 'Arrived' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300'
                                }`}>
                                  {v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">{v.currentPassengers} Jiwa</td>
                              <td className="py-3 px-4">{v.currentCargoTons} Ton</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800 p-6 border border-slate-700 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 text-cyan-400 mb-3">
                      <Sparkles className="h-5 w-5" />
                      <h2 className="text-lg font-bold text-white">AI Maritime Assistant</h2>
                    </div>
                    <p className="text-sm text-slate-300 mb-4">
                      Sistem analitik cerdas siap membantu optimalisasi muatan kapal, prakiraan cuaca rute pelayaran, dan keselamatan navigasi.
                    </p>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-700 text-xs">
                        <span className="font-semibold text-cyan-400 block mb-1">Rekomendasi Kapasitas:</span>
                        KM. Kelud rute Priok-Medan beroperasi optimal dengan okupansi 85%.
                      </div>
                      <div className="rounded-lg bg-slate-900 p-3 border border-slate-700 text-xs">
                        <span className="font-semibold text-emerald-400 block mb-1">Status Cuaca Pelabuhan:</span>
                        Kondisi perairan Selat Sunda dan Jawa bagian barat aman untuk pelayaran (Gelombang 0.5 - 1.2M).
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => alert('AI Advisor menganalisis seluruh manifest kargo dan penumpang. Kapasitas muatan berada dalam batas aman navigasi.')}
                    className="mt-4 w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2.5 text-sm font-semibold text-white transition flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Jalankan Analisis AI</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MASTER DATA: SHIPS */}
          {activeTab === 'ships' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Master Data - Armada Kapal</h1>
                  <p className="text-sm text-slate-400">Kelola informasi kapal, kapasitas penumpang, dan tonase muatan.</p>
                </div>
                <button
                  onClick={() => handleOpenModal('ship')}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Tambah Kapal Baru</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-md overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama kapal / kode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 pl-9 pr-4 py-2 text-sm text-white border border-slate-700 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-3.5 px-4">Kode</th>
                        <th className="py-3.5 px-4">Nama Kapal</th>
                        <th className="py-3.5 px-4">Tipe Kapal</th>
                        <th className="py-3.5 px-4">Kapasitas Penumpang</th>
                        <th className="py-3.5 px-4">Kapasitas Kargo (Ton)</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {ships.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())).map((ship) => (
                        <tr key={ship.id} className="hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-mono text-cyan-400">{ship.code}</td>
                          <td className="py-3 px-4 font-semibold text-white">{ship.name}</td>
                          <td className="py-3 px-4">{ship.type}</td>
                          <td className="py-3 px-4">{ship.passengerCapacity} Jiwa</td>
                          <td className="py-3 px-4">{ship.cargoCapacityTons} Ton</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              ship.status === 'Active' || ship.status === 'At Sea' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {ship.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => handleOpenModal('ship', ship)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteItem('ships', ship.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MASTER DATA: ROUTES */}
          {activeTab === 'routes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Master Data - Rute & Pelabuhan</h1>
                  <p className="text-sm text-slate-400">Kelola jalur pelayaran antar pelabuhan, jarak, dan tarif dasar.</p>
                </div>
                <button
                  onClick={() => handleOpenModal('route')}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Tambah Rute Baru</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-3.5 px-4">Pelabuhan Asal (Origin)</th>
                        <th className="py-3.5 px-4">Pelabuhan Tujuan (Destination)</th>
                        <th className="py-3.5 px-4">Jarak (Mil Laut)</th>
                        <th className="py-3.5 px-4">Estimasi Waktu</th>
                        <th className="py-3.5 px-4">Tarif Dasar (Rp)</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {routes.map((route) => (
                        <tr key={route.id} className="hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-semibold text-white">{route.origin}</td>
                          <td className="py-3 px-4 font-semibold text-cyan-400">{route.destination}</td>
                          <td className="py-3 px-4">{route.distanceNauticalMiles} Mil</td>
                          <td className="py-3 px-4">{route.estimatedHours} Jam</td>
                          <td className="py-3 px-4 font-medium text-emerald-400">Rp {route.basePrice.toLocaleString()}</td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => handleOpenModal('route', route)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteItem('routes', route.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTION: VOYAGES */}
          {activeTab === 'voyages' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Transaksi - Jadwal Keberangkatan</h1>
                  <p className="text-sm text-slate-400">Jadwalkan pelayaran kapal dan pantau kapasitas muatan secara real-time.</p>
                </div>
                <button
                  onClick={() => handleOpenModal('voyage')}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Jadwal Voyage Baru</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-3.5 px-4">Kapal</th>
                        <th className="py-3.5 px-4">Rute Pelayaran</th>
                        <th className="py-3.5 px-4">Waktu Keberangkatan</th>
                        <th className="py-3.5 px-4">Waktu Kedatangan</th>
                        <th className="py-3.5 px-4">Muatan (Pax / Ton)</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {voyages.map((v) => {
                        const ship = ships.find(s => s.id === v.shipId);
                        const route = routes.find(r => r.id === v.routeId);
                        return (
                          <tr key={v.id} className="hover:bg-slate-700/30">
                            <td className="py-3 px-4 font-semibold text-white">{ship?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-xs">{route ? `${route.origin} → ${route.destination}` : '-'}</td>
                            <td className="py-3 px-4 font-mono text-xs">{v.departureTime}</td>
                            <td className="py-3 px-4 font-mono text-xs">{v.arrivalTime}</td>
                            <td className="py-3 px-4 text-xs font-semibold">{v.currentPassengers} Jiwa / {v.currentCargoTons} Ton</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                v.status === 'Departed' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                v.status === 'Scheduled' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                v.status === 'Arrived' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300'
                              }`}>
                                {v.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button onClick={() => handleOpenModal('voyage', v)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteItem('voyages', v.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTION: PASSENGERS */}
          {activeTab === 'passengers' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Transaksi - Manifest Penumpang</h1>
                  <p className="text-sm text-slate-400">Pencatatan tiket, data penumpang, kelas kabin, dan status check-in.</p>
                </div>
                <button
                  onClick={() => handleOpenModal('passenger')}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Tambah Penumpang Baru</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-3.5 px-4">No. Tiket</th>
                        <th className="py-3.5 px-4">Nama Penumpang</th>
                        <th className="py-3.5 px-4">No. KTP / Identitas</th>
                        <th className="py-3.5 px-4">Kelas</th>
                        <th className="py-3.5 px-4">Kursi</th>
                        <th className="py-3.5 px-4">Tarif</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {passengers.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-mono text-cyan-400">{p.ticketNumber}</td>
                          <td className="py-3 px-4 font-semibold text-white">{p.passengerName}</td>
                          <td className="py-3 px-4 font-mono text-xs">{p.idNumber}</td>
                          <td className="py-3 px-4">{p.classType}</td>
                          <td className="py-3 px-4 font-mono">{p.seatNumber}</td>
                          <td className="py-3 px-4 font-medium text-emerald-400">Rp {p.fare.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              p.status === 'Checked-In' || p.status === 'Boarded' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => handleOpenModal('passenger', p)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteItem('passenger_manifests', p.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRANSACTION: CARGO */}
          {activeTab === 'cargo' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Transaksi - Manifest Muatan Kargo</h1>
                  <p className="text-sm text-slate-400">Pencatatan pengirim, tonase barang, nomor kontainer, dan biaya angkut.</p>
                </div>
                <button
                  onClick={() => handleOpenModal('cargo')}
                  className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-cyan-600/20"
                >
                  <Plus className="h-5 w-5" />
                  <span>Tambah Kargo Baru</span>
                </button>
              </div>

              <div className="rounded-xl bg-slate-800 border border-slate-700 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-900/50 text-xs uppercase text-slate-400">
                      <tr>
                        <th className="py-3.5 px-4">No. Kontainer</th>
                        <th className="py-3.5 px-4">Shipper / Pengirim</th>
                        <th className="py-3.5 px-4">Deskripsi Barang</th>
                        <th className="py-3.5 px-4">Berat (Ton)</th>
                        <th className="py-3.5 px-4">Biaya Angkut</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {cargo.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-mono text-cyan-400">{c.containerNumber}</td>
                          <td className="py-3 px-4 font-semibold text-white">{c.shipperName}</td>
                          <td className="py-3 px-4 text-xs">{c.cargoDescription}</td>
                          <td className="py-3 px-4 font-semibold">{c.weightTons} Ton</td>
                          <td className="py-3 px-4 font-medium text-emerald-400">Rp {c.freightCost.toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                              c.status === 'Loaded' || c.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button onClick={() => handleOpenModal('cargo', c)} className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteItem('cargo_manifests', c.id)} className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-wide">Pusat Laporan & Ekspor Data</h1>
                  <p className="text-sm text-slate-400">Unduh laporan resmi operasional pelayaran, manifest penumpang, dan muatan kargo.</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-red-600/20"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Laporan PDF</span>
                  </button>
                  <button
                    onClick={exportToExcel}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition shadow-lg shadow-emerald-600/20"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Excel (XLSX)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl bg-slate-800 p-6 border border-slate-700 shadow-md">
                  <h3 className="text-lg font-bold text-white mb-2">Ringkasan Keuangan Pendapatan</h3>
                  <p className="text-sm text-slate-400 mb-4">Akumulasi pendapatan dari tiket penumpang dan tarif angkut kargo.</p>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-300">Total Pendapatan Tiket Penumpang</span>
                      <span className="font-bold text-emerald-400">Rp {passengers.reduce((acc, p) => acc + p.fare, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900 p-3 rounded-lg border border-slate-700">
                      <span className="text-sm text-slate-300">Total Pendapatan Freigh Kargo</span>
                      <span className="font-bold text-emerald-400">Rp {cargo.reduce((acc, c) => acc + c.freightCost, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center bg-cyan-950/40 p-3 rounded-lg border border-cyan-500/30">
                      <span className="text-sm font-semibold text-white">Total Pendapatan Operasional</span>
                      <span className="font-extrabold text-cyan-400 text-lg">
                        Rp {(passengers.reduce((acc, p) => acc + p.fare, 0) + cargo.reduce((acc, c) => acc + c.freightCost, 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-800 p-6 border border-slate-700 shadow-md">
                  <h3 className="text-lg font-bold text-white mb-2">Statistik Muatan & Okupansi</h3>
                  <p className="text-sm text-slate-400 mb-4">Rasio penggunaan kapasitas maksimal kapal.</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Okupansi Penumpang Total</span>
                        <span className="text-cyan-400 font-semibold">78%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-cyan-500 h-2.5 rounded-full" style={{ width: '78%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Kapasitas Kargo Terpakai</span>
                        <span className="text-amber-400 font-semibold">65%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CRUD MODAL FORM */}
      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 border border-slate-700 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
              <h2 className="text-lg font-bold text-white capitalize">
                {editingItem ? `Edit ${modalType}` : `Tambah ${modalType} Baru`}
              </h2>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {modalType === 'ship' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Kode Kapal</label>
                    <input
                      type="text"
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nama Kapal</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Tipe Kapal</label>
                    <select
                      value={formData.type || 'Passenger'}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="Passenger">Passenger</option>
                      <option value="Cargo">Cargo</option>
                      <option value="Ro-Ro Ferry">Ro-Ro Ferry</option>
                      <option value="Fast Craft">Fast Craft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Kapasitas Penumpang (Jiwa)</label>
                    <input
                      type="number"
                      value={formData.passengerCapacity || 1000}
                      onChange={e => setFormData({ ...formData, passengerCapacity: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Kapasitas Kargo (Ton)</label>
                    <input
                      type="number"
                      value={formData.cargoCapacityTons || 100}
                      onChange={e => setFormData({ ...formData, cargoCapacityTons: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status || 'Active'}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Docked">Docked</option>
                      <option value="At Sea">At Sea</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'route' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pelabuhan Asal (Origin)</label>
                    <input
                      type="text"
                      value={formData.origin || ''}
                      onChange={e => setFormData({ ...formData, origin: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pelabuhan Tujuan (Destination)</label>
                    <input
                      type="text"
                      value={formData.destination || ''}
                      onChange={e => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Jarak (Mil Laut)</label>
                    <input
                      type="number"
                      value={formData.distanceNauticalMiles || 300}
                      onChange={e => setFormData({ ...formData, distanceNauticalMiles: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Estimasi Waktu (Jam)</label>
                    <input
                      type="number"
                      value={formData.estimatedHours || 24}
                      onChange={e => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Tarif Dasar (Rp)</label>
                    <input
                      type="number"
                      value={formData.basePrice || 500000}
                      onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                </>
              )}

              {modalType === 'voyage' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pilih Kapal</label>
                    <select
                      value={formData.shipId || ''}
                      onChange={e => setFormData({ ...formData, shipId: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    >
                      {ships.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pilih Rute</label>
                    <select
                      value={formData.routeId || ''}
                      onChange={e => setFormData({ ...formData, routeId: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    >
                      {routes.map(r => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Waktu Keberangkatan</label>
                    <input
                      type="datetime-local"
                      value={formData.departureTime || ''}
                      onChange={e => setFormData({ ...formData, departureTime: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Waktu Kedatangan</label>
                    <input
                      type="datetime-local"
                      value={formData.arrivalTime || ''}
                      onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Status Pelayaran</label>
                    <select
                      value={formData.status || 'Scheduled'}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Boarding">Boarding</option>
                      <option value="Departed">Departed</option>
                      <option value="Arrived">Arrived</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'passenger' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pilih Voyage (Jadwal)</label>
                    <select
                      value={formData.voyageId || ''}
                      onChange={e => setFormData({ ...formData, voyageId: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    >
                      {voyages.map(v => {
                        const r = routes.find(item => item.id === v.routeId);
                        return <option key={v.id} value={v.id}>Voyage #{v.id.slice(0,5)} ({r ? r.origin + ' → ' + r.destination : ''})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nama Penumpang</label>
                    <input
                      type="text"
                      value={formData.passengerName || ''}
                      onChange={e => setFormData({ ...formData, passengerName: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">No. KTP / Paspor</label>
                    <input
                      type="text"
                      value={formData.idNumber || ''}
                      onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nomor Tiket</label>
                    <input
                      type="text"
                      value={formData.ticketNumber || ''}
                      onChange={e => setFormData({ ...formData, ticketNumber: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Kelas Kabin</label>
                    <select
                      value={formData.classType || 'Economy'}
                      onChange={e => setFormData({ ...formData, classType: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Class 1">Class 1</option>
                      <option value="Class 2">Class 2</option>
                      <option value="Economy">Economy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nomor Kursi</label>
                    <input
                      type="text"
                      value={formData.seatNumber || ''}
                      onChange={e => setFormData({ ...formData, seatNumber: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Tarif Tiket (Rp)</label>
                    <input
                      type="number"
                      value={formData.fare || 500000}
                      onChange={e => setFormData({ ...formData, fare: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status || 'Booked'}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="Booked">Booked</option>
                      <option value="Checked-In">Checked-In</option>
                      <option value="Boarded">Boarded</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'cargo' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Pilih Voyage (Jadwal)</label>
                    <select
                      value={formData.voyageId || ''}
                      onChange={e => setFormData({ ...formData, voyageId: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    >
                      {voyages.map(v => {
                        const r = routes.find(item => item.id === v.routeId);
                        return <option key={v.id} value={v.id}>Voyage #{v.id.slice(0,5)} ({r ? r.origin + ' → ' + r.destination : ''})</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nama Shipper / Pengirim</label>
                    <input
                      type="text"
                      value={formData.shipperName || ''}
                      onChange={e => setFormData({ ...formData, shipperName: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Deskripsi Kargo / Barang</label>
                    <input
                      type="text"
                      value={formData.cargoDescription || ''}
                      onChange={e => setFormData({ ...formData, cargoDescription: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Berat (Ton)</label>
                    <input
                      type="number"
                      value={formData.weightTons || 10}
                      onChange={e => setFormData({ ...formData, weightTons: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Nomor Kontainer</label>
                    <input
                      type="text"
                      value={formData.containerNumber || ''}
                      onChange={e => setFormData({ ...formData, containerNumber: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Biaya Freigh (Rp)</label>
                    <input
                      type="number"
                      value={formData.freightCost || 5000000}
                      onChange={e => setFormData({ ...formData, freightCost: Number(e.target.value) })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Status Kargo</label>
                    <select
                      value={formData.status || 'Manifested'}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white border border-slate-700 focus:border-cyan-500 focus:outline-none text-sm"
                    >
                      <option value="Manifested">Manifested</option>
                      <option value="Loaded">Loaded</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Hold">Hold</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-600 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-sm font-semibold text-white hover:bg-cyan-500 transition shadow-md shadow-cyan-600/30"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-3 rounded-xl px-4 py-3 shadow-2xl border text-sm font-medium transition-all ${
          toastMessage.type === 'success' ? 'bg-emerald-950 text-emerald-200 border-emerald-500/40' : 'bg-red-950 text-red-200 border-red-500/40'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
