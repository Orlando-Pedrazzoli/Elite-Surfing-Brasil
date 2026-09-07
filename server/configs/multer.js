// server/configs/multer.js
import multer from 'multer';

// ═══════════════════════════════════════════════════════════════════════
// 🔧 FIX: antes o multer aceitava QUALQUER arquivo de QUALQUER tamanho —
// toda a validação vivia só no frontend. Agora o backend também valida:
//   - Campo "images" → apenas image/*
//   - Campo "video"  → apenas video/*
//   - Máx. 25MB por arquivo, máx. 9 arquivos por request
// (No Vercel o corpo total já é limitado a ~4.5MB — estes limites são a
// segunda linha de defesa e valem também em dev local.)
// ═══════════════════════════════════════════════════════════════════════

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'images') {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(
      new Error(`"${file.originalname}" não é uma imagem válida`),
      false,
    );
  }

  if (file.fieldname === 'video') {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    return cb(new Error(`"${file.originalname}" não é um vídeo válido`), false);
  }

  // Outros campos (uso futuro): aceita — mantém comportamento anterior
  cb(null, true);
};

export const upload = multer({
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB por arquivo
    files: 9, // 8 imagens + 1 vídeo
  },
  fileFilter,
});

// ═══════════════════════════════════════════════════════════════════════
// Middleware de erro do multer — sem ele, um arquivo rejeitado derruba a
// request com HTML 500 genérico. Com ele, o frontend recebe JSON legível.
// Uso no productRoute.js (envolvendo o upload):
//
//   productRouter.post('/add', authSeller,
//     handleUpload([{ name: 'images', maxCount: 8 }, { name: 'video', maxCount: 1 }]),
//     addProduct);
// ═══════════════════════════════════════════════════════════════════════
export const handleUpload = fields => (req, res, next) => {
  upload.fields(fields)(req, res, err => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Arquivo muito grande (máx. 25MB)'
          : err.message || 'Erro no upload de arquivos';
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};
