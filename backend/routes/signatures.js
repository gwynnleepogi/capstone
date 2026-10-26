
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');

const router = express.Router();

const uploadFolder = path.join(__dirname, '..', 'uploads', 'signatures');

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = 'signature_' + req.params.userId + '_' + Date.now() + extension;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and WEBP images are allowed.'));
    }
  }
});

router.post('/:userId', upload.single('signature'), async function (req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a signature image.' });
    }

    const userId = req.params.userId;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, signature_path')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User not found.' });
    }

    const signaturePath = '/signatures/' + req.file.filename;

    const { error: updateError } = await supabase
      .from('users')
      .update({ signature_path: signaturePath })
      .eq('id', userId);

    if (updateError) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: updateError.message });
    }

    if (user.signature_path) {
      const oldFilename = path.basename(user.signature_path);
      const oldPath = path.join(uploadFolder, oldFilename);

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.json({
      message: 'Signature uploaded successfully.',
      signature_path: signaturePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:userId', async function (req, res) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, signature_path')
      .eq('id', req.params.userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
