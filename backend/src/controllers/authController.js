const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    if (req.headers['x-debug-auth'] === 'true') {
      return res.json({
        debug: true,
        adminUsernameExists: !!process.env.ADMIN_USERNAME,
        adminPasswordHashExists: !!process.env.ADMIN_PASSWORD_HASH,
        adminPasswordHashLength: process.env.ADMIN_PASSWORD_HASH?.length ?? 0,
        jwtSecretExists: !!process.env.JWT_SECRET,
        vercelEnv: process.env.VERCEL_ENV ?? null,
      });
    }

    console.log('DEBUG - ADMIN_USERNAME existe:', !!process.env.ADMIN_USERNAME);
    console.log('DEBUG - ADMIN_PASSWORD_HASH existe:', !!process.env.ADMIN_PASSWORD_HASH);
    console.log('DEBUG - ADMIN_PASSWORD_HASH longitud:', process.env.ADMIN_PASSWORD_HASH?.length);
    console.log('DEBUG - JWT_SECRET existe:', !!process.env.JWT_SECRET);
    console.log('DEBUG - usuario recibido:', req.body.usuario);

    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: usuario, password' });
    }

    if (usuario !== process.env.ADMIN_USERNAME) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const passwordValida = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { usuario },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login };
