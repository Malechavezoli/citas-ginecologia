const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
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
