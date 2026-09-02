import { Link } from "react-router-dom";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaTiktok,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";
import "./Footer.css";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <img src="/logo.png" alt="CyberWeb" className="footer-logo" />
          <p>
            Electrónica, gaming, audio e instrumentos musicales con garantía
            real y soporte cercano. Tu tienda tech de confianza.
          </p>

          <div className="footer-social">
            <a
              href="https://www.facebook.com/CyberPuntarenas"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
            >
              <FaFacebookF />
            </a>
            <a
              href="https://wa.me/50661621010"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
            >
              <FaWhatsapp />
            </a>
            <a
              href="https://www.instagram.com/cyberpuntarenas/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>
            <a
              href="https://www.tiktok.com/@suministroscyber"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
            >
              <FaTiktok />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Tienda</h4>
          <Link to="/catalogo">Catálogo</Link>
          <Link to="/descuentos">Descuentos</Link>
          <Link to="/tiendas">Nuestra tienda</Link>
          <Link to="/garantias">Garantías y devoluciones</Link>
        </div>

        <div className="footer-col">
          <h4>Empresa</h4>
          <Link to="/nosotros">Sobre nosotros</Link>
          <Link to="/mi-cuenta">Mi cuenta</Link>
          <Link to="/mi-cuenta/pedidos">Mis pedidos</Link>
          <Link to="/cart">Carrito</Link>
        </div>

        <div className="footer-col">
          <h4>Contacto</h4>
          <span className="footer-contact-line">
            <FaMapMarkerAlt /> Puntarenas, Costa Rica
          </span>
          <a href="tel:+50661621010" className="footer-contact-line">
            <FaPhoneAlt /> +506 6162-1010
          </a>
          <a href="mailto:info@cyberweb.cr" className="footer-contact-line">
            <FaEnvelope /> info@cyberweb.cr
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {year} CyberWeb — Todos los derechos reservados</p>
        <p className="footer-payments">SINPE Móvil · Transferencia · Efectivo</p>
      </div>
    </footer>
  );
};

export default Footer;
