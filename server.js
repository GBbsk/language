const express = require('express');
const app = express();
const path = require('path');
const multer = require('multer');
const session = require('express-session');
require('dotenv').config();
const { db, auth } = require('./config/firebase');
const { 
    collection, 
    getDocs, 
    addDoc, 
    updateDoc,
    deleteDoc,
    doc,
    query,
    where 
} = require('firebase/firestore');
const bcrypt = require('bcrypt');
const fs = require('fs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use(express.static(__dirname));

// Configuração de sessão
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Configuração do Multer para armazenamento local
const multerStorage = multer.diskStorage({
    destination: function(req, file, cb) {
        let dest = 'uploads/';
        if (file.mimetype.startsWith('video/')) dest += 'videos/';
        else if (file.mimetype.startsWith('audio/')) dest += 'audios/';
        else if (file.mimetype.startsWith('image/')) dest += 'thumbnails/';
        else dest += 'materiais/';
        cb(null, dest);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: multerStorage });

// Middleware de autenticação
function checkAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/admin-login');
    }
}

// Rotas estáticas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/Videos do projeto', express.static(path.join(__dirname, 'Videos do projeto')));
app.use('/Arquivos do projeto', express.static(path.join(__dirname, 'Arquivos do projeto')));
app.use('/audios do projeto', express.static(path.join(__dirname, 'audios do projeto')));

// Rotas administrativas
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-login.html'));
});

app.get('/admin-panel', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'admin-panel.html'));
});

// Login com Firebase
app.post('/admin/login', async (req, res) => {
    try {
        const adminsRef = collection(db, 'admins');
        const q = query(adminsRef, where('username', '==', req.body.username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return res.redirect('/admin-login?error=user');
        }

        const admin = querySnapshot.docs[0].data();
        const isValid = await bcrypt.compare(req.body.password, admin.password);
        
        if (!isValid) {
            return res.redirect('/admin-login?error=password');
        }

        req.session.authenticated = true;
        res.redirect('/admin-panel');
    } catch (error) {
        res.redirect('/admin-login?error=server');
    }
});

// API Routes
app.get('/api/modulos', async (req, res) => {
    try {
        const modulosRef = collection(db, 'modulos');
        const querySnapshot = await getDocs(modulosRef);
        const modulos = [];
        
        querySnapshot.forEach((doc) => {
            modulos.push({ id: doc.id, ...doc.data() });
        });
        
        res.json(modulos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Criar pastas se não existirem
const dirs = [
    'uploads',
    'uploads/videos',
    'uploads/thumbnails',
    'uploads/materiais',
    'uploads/audios'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Rota para upload de aulas
app.post('/api/aulas', checkAuth, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            throw new Error('Nenhum arquivo enviado');
        }

        // Salvar dados da aula no Firestore
        const aulaRef = await db.collection('aulas').add({
            moduloId: req.body.modulo,
            titulo: req.body.titulo,
            videoUrl: req.file.path.replace(/\\/g, '/'), // Corrige o caminho para formato URL
            dataCriacao: new Date()
        });

        res.json({ success: true, aulaId: aulaRef.id });
    } catch (error) {
        console.error('Erro ao salvar aula:', error);
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
}); 