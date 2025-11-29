import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Menu, X, Download, User, Camera, Grid, 
  Layers, Plus, Trash2, Edit2, Check, Lock, ChevronLeft,
  Image as ImageIcon, LogOut, ArrowRight, Upload, ChevronRight, Hash,
  Loader, Settings, Key, Mail
} from 'lucide-react';

// ✅ مكتبة الإيميل مفعلة (تأكد من تثبيتها: npm install @emailjs/browser)
import emailjs from '@emailjs/browser';

import { initializeApp } from "firebase/app";
import { 
  getAuth, signInAnonymously, onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, serverTimestamp
} from "firebase/firestore";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDhi5R_uYSFR63UrkheaOhUEQyAJbhwFYc",
  authDomain: "hotstuff-site.firebaseapp.com",
  projectId: "hotstuff-site",
  storageBucket: "hotstuff-site.firebasestorage.app",
  messagingSenderId: "773652663190",
  appId: "1:773652663190:web:208763812ffec7f73dabb7",
  measurementId: "G-1H35VYPDQ0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "production-app-v1"; 

const IMGBB_API_KEY = "61032d044cea0fc257b6f609f2064267";
const BACKUP_MASTER_PASSWORD = "Devil@0146968834"; 

// --- Utils ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; 
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = (scaleSize < 1) ? MAX_WIDTH : img.width;
        canvas.height = (scaleSize < 1) ? img.height * scaleSize : img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const uploadToImgBB = async (base64Image, apiKey) => {
  if (!apiKey) throw new Error("API Key missing");
  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""));
  const response = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
  const data = await response.json();
  if (data.success) return data.data.url;
  throw new Error(data.error?.message || "Upload failed");
};

// --- Components ---
const Button = ({ children, onClick, variant = 'primary', className = '', disabled, ...props }) => {
  const variants = {
    primary: 'bg-rose-600 hover:bg-rose-700 text-white',
    secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
    outline: 'border border-zinc-700 hover:border-zinc-500 text-zinc-300',
    ghost: 'hover:bg-zinc-800 text-zinc-400 hover:text-white',
    danger: 'bg-red-900/50 text-red-400 hover:bg-red-900/80 border border-red-900'
  };
  return (
    <button 
      onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {disabled && <Loader className="animate-spin" size={16} />}
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1 mb-4">
    {label && <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">{label}</label>}
    <input className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-rose-500 w-full" {...props} />
  </div>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm rounded-xl overflow-hidden ${className}`}>{children}</div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

const Lightbox = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex((prev) => (prev + 1) % images.length);
      if (e.key === 'ArrowLeft') setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images, onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center">
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white bg-black/50 rounded-full"><X size={32} /></button>
      <div className="absolute top-4 left-4 text-white font-mono text-sm bg-black/50 px-3 py-1 rounded-full">{currentIndex + 1} / {images.length}</div>
      <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); }} className="absolute left-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full"><ChevronLeft size={48} /></button>
      <img src={images[currentIndex]} alt="View" className="max-h-[85vh] max-w-[90vw] object-contain shadow-2xl" />
      <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); }} className="absolute right-4 p-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full"><ChevronRight size={48} /></button>
      <div className="absolute bottom-4 flex gap-2 overflow-x-auto max-w-[90vw] p-2 custom-scrollbar">
        {images.map((img, idx) => (
          <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${idx === currentIndex ? 'border-rose-500 opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}>
            <img src={img} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---
export default function HotStuffApp() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); 
  const [activeModel, setActiveModel] = useState(null);
  const [activeShoot, setActiveShoot] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const [models, setModels] = useState([]);
  const [shoots, setShoots] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  useEffect(() => {
    const initAuth = async () => { await signInAnonymously(auth); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    if (localStorage.getItem('hotstuff_admin_session') === 'active') setIsAdminMode(true);
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
      setIsAdminMode(false);
      localStorage.removeItem('hotstuff_admin_session');
      setView('home');
  };

  useEffect(() => {
    if (!user) return;
    const un1 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'models'), (s) => setModels(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const un2 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'shoots'), (s) => setShoots(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const un3 = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { un1(); un2(); un3(); };
  }, [user]);

  const filteredModels = useMemo(() => {
    let result = models;
    if (searchQuery) result = result.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedCategories.length > 0) {
      const validIds = new Set();
      shoots.forEach(s => {
        if (s.categoryIds?.some(cid => selectedCategories.includes(cid))) {
          if (s.modelIds) s.modelIds.forEach(id => validIds.add(id));
          else if (s.modelId) validIds.add(s.modelId);
        }
      });
      result = result.filter(m => validIds.has(m.id));
    }
    return result;
  }, [models, shoots, searchQuery, selectedCategories]);

  const handleRequestCode = async () => {
    setSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
        await emailjs.send("hotstuff-site", "template_r60ypa9", {
            to_email: 'Hamadaxhunter@gmail.com', to_name: 'Admin', message: code, code: code, otp: code
        }, "gVCghL1oxJxGFW5Mr");
        setGeneratedOtp(code);
        setIsOtpSent(true);
        alert(`كسمك`);
    } catch (error) {
        alert(`فشل إرسال الإيميل: ${JSON.stringify(error.text || error)}`);
    } finally {
        setSendingOtp(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === BACKUP_MASTER_PASSWORD) {
        setIsAdminMode(true); setShowLoginModal(false); setView('admin');
        localStorage.setItem('hotstuff_admin_session', 'active'); return;
    }
    if (adminPassword === generatedOtp) {
        setIsAdminMode(true); setShowLoginModal(false); setView('admin');
        localStorage.setItem('hotstuff_admin_session', 'active');
    } else {
      alert('Invalid Code/Password.');
    }
  };

  const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setView('home'); setActiveModel(null); setActiveShoot(null); }}>
        <span className="text-xl font-bold text-white">HOT<span className="font-light text-zinc-400">STUFF</span></span>
      </div>
      <div className="flex-1 max-w-md mx-8 hidden md:block relative">
        <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
        <input type="text" placeholder="Search..." className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-rose-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        {isAdminMode ? 
          <><Button variant="secondary" onClick={() => setView('admin')}><Layers size={16}/> Dash</Button><Button variant="secondary" onClick={handleLogout}><LogOut size={16}/></Button></> : 
          <button onClick={() => setShowLoginModal(true)} className="text-xs font-bold uppercase text-zinc-500 hover:text-white">Admin Access</button>
        }
      </div>
    </nav>
  );

  const HomeView = () => (
    <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="md:hidden mb-6 relative">
        <Search className="absolute left-3 top-2.5 text-zinc-500" size={18} />
        <input type="text" placeholder="Search..." className="w-full bg-zinc-900 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-6 mb-4 custom-scrollbar">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategories(p => p.includes(cat.id) ? p.filter(c => c!==cat.id) : [...p, cat.id])} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium ${selectedCategories.includes(cat.id) ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400'}`}>{cat.name}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredModels.map(model => (
          <div key={model.id} onClick={() => { setActiveModel(model); setView('model'); }} className="group cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900">
            <img src={model.image} alt={model.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6">
              <h3 className="text-2xl font-bold text-white mb-1">{model.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ModelProfileView = () => {
    if (!activeModel) return null;
    const displayShoots = shoots.filter(s => (s.modelIds?.includes(activeModel.id) || s.modelId === activeModel.id));
    return (
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen animate-fade-in">
        <Button variant="ghost" className="mb-6 pl-0" onClick={() => setView('home')}><ChevronLeft size={20} /> Back</Button>
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div>
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 shadow-2xl mb-4"><img src={activeModel.image} className="w-full h-full object-cover" /></div>
            <h1 className="text-4xl font-bold text-white mb-2">{activeModel.name}</h1>
            <p className="text-zinc-400">{activeModel.bio}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-zinc-800 pb-4">Photoshoots</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {displayShoots.map(shoot => (
                <div key={shoot.id} onClick={() => { setActiveShoot(shoot); setView('gallery'); }} className="group cursor-pointer bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                  <div className="aspect-video relative overflow-hidden"><img src={shoot.cover} className="w-full h-full object-cover" /></div>
                  <div className="p-4"><h3 className="text-lg font-bold text-white">{shoot.title}</h3></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GalleryView = () => {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    
    useEffect(() => {
      if (!activeShoot) return;
      setGalleryImages([...(activeShoot.images || [])]); // صور الغلاف مستبعدة
      const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'shoot_images'), where('shootId', '==', activeShoot.id)), (snap) => {
        const extra = snap.docs.map(d => d.data().imageUrl);
        if (extra.length) setGalleryImages(p => [...p, ...extra]);
      });
      return () => unsub();
    }, [activeShoot]);

    if (!activeShoot) return null;
    return (
      <div className="pt-24 pb-12 px-4 max-w-7xl mx-auto min-h-screen">
        {lightboxIndex !== null && <Lightbox images={galleryImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
        <div className="flex justify-between mb-6">
          <Button variant="ghost" onClick={() => setView('model')}><ChevronLeft size={20} /> Back</Button>
          <Button variant="primary" onClick={() => activeShoot.downloadUrl ? window.open(activeShoot.downloadUrl, '_blank') : alert("No link.")}><Download size={18} /> Download Set</Button>
        </div>
        <h1 className="text-3xl font-bold text-white mb-8">{activeShoot.title}</h1>
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
          {galleryImages.map((img, idx) => (
            <div key={idx} onClick={() => setLightboxIndex(idx)} className="break-inside-avoid rounded-xl overflow-hidden cursor-zoom-in"><img src={img} className="w-full h-auto" /></div>
          ))}
        </div>
      </div>
    );
  };

  const AdminDashboard = () => {
    const [tab, setTab] = useState('models');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [imgbbKey, setImgbbKey] = useState(() => localStorage.getItem('imgbb_api_key') || IMGBB_API_KEY);
    const [showSettings, setShowSettings] = useState(false);

    const [modelForm, setModelForm] = useState({ id: null, name: '', bio: '', image: '' });
    const [catName, setCatName] = useState('');
    const [shootForm, setShootForm] = useState({ id: null, title: '', modelIds: [], cover: '', imagesText: '', categoryIds: [], tagsText: '', downloadUrl: '', uploadedUrls: [] });

    const uploadFile = async (file) => {
        try {
            const compressed = await compressImage(file);
            return await uploadToImgBB(compressed, imgbbKey);
        } catch (e) { alert(e.message); return null; }
    };

    const handleGalleryUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      setUploadStatus('Uploading...'); setIsSaving(true);
      for (const file of files) {
          const url = await uploadFile(file);
          if (url) setShootForm(prev => ({ ...prev, uploadedUrls: [...prev.uploadedUrls, url] }));
      }
      setIsSaving(false); setUploadStatus('');
    };

    const saveModel = async () => {
      if (!modelForm.name) return;
      const data = { name: modelForm.name, bio: modelForm.bio, image: modelForm.image };
      if (modelForm.id) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'models', modelForm.id), data);
      else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'models'), data);
      setModelForm({ id: null, name: '', bio: '', image: '' }); setIsEditing(false);
    };

    const saveShoot = async () => {
      if (!shootForm.title) return;
      setIsSaving(true);
      const data = {
        title: shootForm.title, modelIds: shootForm.modelIds, cover: shootForm.cover,
        images: [...shootForm.imagesText.split('\n').filter(u=>u.trim()), ...shootForm.uploadedUrls],
        categoryIds: shootForm.categoryIds, tags: shootForm.tagsText.split(',').map(t=>t.trim()).filter(t=>t),
        downloadUrl: shootForm.downloadUrl,
      };
      if (shootForm.id) {
          data.updatedAt = serverTimestamp();
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shoots', shootForm.id), data);
      } else {
          data.createdAt = serverTimestamp();
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'shoots'), data);
      }
      setShootForm({ id: null, title: '', modelIds: [], cover: '', imagesText: '', categoryIds: [], tagsText: '', downloadUrl: '', uploadedUrls: [] });
      setIsEditing(false); setIsSaving(false);
    };

    if (showSettings) return (
        <div className="pt-24 px-4 max-w-lg mx-auto min-h-screen text-white">
            <Card className="p-6"><h2 className="text-xl font-bold mb-4">Settings</h2><Input label="ImgBB API Key" value={imgbbKey} onChange={e=>setImgbbKey(e.target.value)} /><div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setShowSettings(false)}>Cancel</Button><Button onClick={()=>{localStorage.setItem('imgbb_api_key', imgbbKey); setShowSettings(false)}}>Save</Button></div></Card>
        </div>
    );

    return (
      <div className="pt-24 px-4 max-w-6xl mx-auto min-h-screen text-white">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex gap-2"><Button variant="outline" onClick={()=>setShowSettings(true)}><Settings size={16}/></Button><Button variant="secondary" onClick={handleLogout}>Exit</Button></div>
        </div>
        <div className="flex gap-4 border-b border-zinc-800 mb-8">
          {['models', 'shoots', 'categories'].map(t => <button key={t} onClick={()=>setTab(t)} className={`pb-4 px-2 uppercase font-bold ${tab===t?'border-b-2 border-rose-500':''}`}>{t}</button>)}
        </div>

        {tab === 'categories' && (
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6 h-fit"><h3 className="font-bold mb-4">Add Category</h3><div className="flex gap-2"><input className="flex-1 bg-zinc-800 p-2 rounded text-white" value={catName} onChange={e=>setCatName(e.target.value)} /><Button onClick={async()=>{if(catName) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'categories'), {name:catName}); setCatName('')}}}><Plus size={18}/></Button></div></Card>
              <div className="space-y-2">{categories.map(c=><div key={c.id} className="flex justify-between p-3 bg-zinc-900 rounded border border-zinc-800">{c.name}<button onClick={()=>confirm('Del?')&&deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'categories', c.id))} className="text-red-500"><Trash2 size={16}/></button></div>)}</div>
            </div>
        )}

        {tab === 'models' && (
            <div>
               <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Models</h3><Button onClick={()=>{setModelForm({id:null,name:'',bio:'',image:''}); setIsEditing(true)}}><Plus size={16}/> New</Button></div>
               {isEditing && (
                   <Card className="p-6 mb-8"><h3 className="font-bold mb-4">{modelForm.id?'Edit':'New'} Model</h3><Input label="Name" value={modelForm.name} onChange={e=>setModelForm({...modelForm,name:e.target.value})}/><Input label="Bio" value={modelForm.bio} onChange={e=>setModelForm({...modelForm,bio:e.target.value})}/><div className="mb-4"><label className="text-xs font-bold text-zinc-500 block mb-1">Image</label><div className="flex gap-2"><Input value={modelForm.image} onChange={e=>setModelForm({...modelForm,image:e.target.value})} className="mb-0"/><label className="bg-zinc-800 px-4 py-2 rounded cursor-pointer"><Upload size={18}/><input type="file" className="hidden" onChange={async(e)=>{if(e.target.files[0]){const url=await uploadFile(e.target.files[0]);if(url)setModelForm({...modelForm,image:url})}}} /></label></div></div><div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setIsEditing(false)}>Cancel</Button><Button onClick={saveModel}>Save</Button></div></Card>
               )}
               <div className="grid gap-4">{models.map(m=><div key={m.id} className="flex items-center gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"><img src={m.image} className="w-12 h-12 rounded-full object-cover"/><div className="flex-1"><h4 className="font-bold">{m.name}</h4></div><button onClick={()=>{setModelForm({id:m.id,name:m.name,bio:m.bio,image:m.image});setIsEditing(true);window.scrollTo(0,0)}} className="text-blue-500 p-2"><Edit2 size={18}/></button><button onClick={()=>confirm('Del?')&&deleteDoc(doc(db,'artifacts',appId,'public','data','models',m.id))} className="text-red-500 p-2"><Trash2 size={18}/></button></div>)}</div>
            </div>
        )}

        {tab === 'shoots' && (
            <div>
               <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">Photoshoots</h3><Button onClick={()=>{setShootForm({id:null,title:'',modelIds:[],cover:'',imagesText:'',categoryIds:[],tagsText:'',downloadUrl:'',uploadedUrls:[]}); setIsEditing(true)}}><Plus size={16}/> New</Button></div>
               {isEditing && (
                 <Card className="p-6 mb-8">
                   <h3 className="font-bold mb-4">{shootForm.id?'Edit':'New'} Shoot</h3>
                   <div className="grid md:grid-cols-2 gap-4"><Input label="Title" value={shootForm.title} onChange={e=>setShootForm({...shootForm,title:e.target.value})}/><Input label="Tags" value={shootForm.tagsText} onChange={e=>setShootForm({...shootForm,tagsText:e.target.value})}/></div>
                   <Input label="Download Link" value={shootForm.downloadUrl} onChange={e=>setShootForm({...shootForm,downloadUrl:e.target.value})}/>
                   <div className="mb-4"><label className="text-xs font-bold text-zinc-500 block mb-2">Models</label><div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-zinc-900 p-2 rounded">{models.map(m=><button key={m.id} onClick={()=>{const ids=shootForm.modelIds.includes(m.id)?shootForm.modelIds.filter(i=>i!==m.id):[...shootForm.modelIds,m.id];setShootForm({...shootForm,modelIds:ids})}} className={`text-xs px-3 py-1 rounded border ${shootForm.modelIds.includes(m.id)?'bg-rose-900 border-rose-500 text-white':'border-zinc-700 text-zinc-400'}`}>{m.name}</button>)}</div></div>
                   <div className="mb-4"><label className="text-xs font-bold text-zinc-500 block mb-2">Categories</label><div className="flex flex-wrap gap-2">{categories.map(c=><button key={c.id} onClick={()=>{const ids=shootForm.categoryIds.includes(c.id)?shootForm.categoryIds.filter(i=>i!==c.id):[...shootForm.categoryIds,c.id];setShootForm({...shootForm,categoryIds:ids})}} className={`text-xs px-2 py-1 rounded border ${shootForm.categoryIds.includes(c.id)?'bg-rose-600 border-rose-600 text-white':'border-zinc-700 text-zinc-400'}`}>{c.name}</button>)}</div></div>
                   <div className="mb-4"><label className="text-xs font-bold text-zinc-500 block mb-1">Cover</label><div className="flex gap-2"><Input value={shootForm.cover} onChange={e=>setShootForm({...shootForm,cover:e.target.value})} className="mb-0"/><label className="bg-zinc-800 px-4 py-2 rounded cursor-pointer"><Upload size={18}/><input type="file" className="hidden" onChange={async(e)=>{if(e.target.files[0]){const url=await uploadFile(e.target.files[0]);if(url)setShootForm({...shootForm,cover:url})}}}/></label></div></div>
                   <div className="mb-4"><label className="text-xs font-bold text-zinc-500 flex justify-between mb-2"><span>Gallery Images</span><label className="cursor-pointer text-rose-400 flex gap-1 items-center"><Upload size={14}/> Upload Multiple<input type="file" multiple className="hidden" onChange={handleGalleryUpload}/></label></label>
                     {uploadStatus && <div className="text-xs text-rose-400 mb-2">{uploadStatus}</div>}
                     <div className="flex flex-wrap gap-2 mb-2">{shootForm.uploadedUrls.map(u=><div key={u} className="w-12 h-12 relative group"><img src={u} className="w-full h-full object-cover"/><div onClick={()=>setShootForm(p=>({...p,uploadedUrls:p.uploadedUrls.filter(x=>x!==u)}))} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer text-white"><X size={12}/></div></div>)}</div>
                   </div>
                   <div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setIsEditing(false)}>Cancel</Button><Button onClick={saveShoot} disabled={isSaving}>{isSaving?'Saving...':'Save Shoot'}</Button></div>
                 </Card>
               )}
               <div className="grid md:grid-cols-2 gap-4">{shoots.map(s=><div key={s.id} className="flex gap-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800"><img src={s.cover} className="w-16 h-16 rounded object-cover"/><div className="flex-1"><h4 className="font-bold">{s.title}</h4><p className="text-xs text-zinc-500">{s.images?.length||0} photos</p></div><div className="flex flex-col gap-2"><button onClick={()=>{setShootForm({id:s.id,title:s.title,modelIds:s.modelIds||[],cover:s.cover||'',imagesText:'',categoryIds:s.categoryIds||[],tagsText:(s.tags||[]).join(', '),downloadUrl:s.downloadUrl||'',uploadedUrls:s.images||[]});setIsEditing(true);window.scrollTo(0,0)}} className="text-blue-500 hover:bg-zinc-800 p-2 rounded"><Edit2 size={18}/></button><button onClick={()=>confirm('Del?')&&deleteDoc(doc(db,'artifacts',appId,'public','data','shoots',s.id))} className="text-red-500 hover:bg-zinc-800 p-2 rounded"><Trash2 size={18}/></button></div></div>)}</div>
            </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-rose-500 selection:text-white">
      <style>{`.custom-scrollbar::-webkit-scrollbar{height:6px;width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:#333;border-radius:3px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:#555}.animate-fade-in{animation:fadeIn 0.4s ease-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Admin Access">
        <div className="space-y-4"><p className="text-sm text-zinc-400">Code will be sent to admin email.</p><Button onClick={handleRequestCode} disabled={sendingOtp || isOtpSent} className="w-full bg-zinc-800 hover:bg-zinc-700">{sendingOtp ? <Loader className="animate-spin" size={16}/> : <Mail size={16}/>} {isOtpSent ? 'Code Sent!' : 'Request Code'}</Button>
          {isOtpSent && <div className="animate-fade-in"><Input type="password" placeholder="Enter Code" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="text-center tracking-widest text-lg"/><Button className="w-full" onClick={handleAdminLogin}>Unlock</Button></div>}
          <div className="border-t border-zinc-800 pt-4 mt-4"><p className="text-xs text-zinc-500 mb-2">Or Master Password:</p><div className="flex gap-2"><Input type="password" placeholder="Master Password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="mb-0"/><Button onClick={handleAdminLogin}>Login</Button></div></div></div>
      </Modal>
      {!isAdminMode || view !== 'admin' ? <Navbar /> : null}
      {view === 'admin' ? <AdminDashboard /> : view === 'model' ? <ModelProfileView /> : view === 'gallery' ? <GalleryView /> : <HomeView />}
      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-600 text-sm mt-12"><p>&copy; {new Date().getFullYear()} Hot Stuff Management.</p></footer>
    </div>
  );
}