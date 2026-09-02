import "./Ubication.css";

const StoreLocation = () => {
  return (
    <div className="store-location-page">
      <div className="store-location-header">
        <h1>Nuestra ubicación</h1>
        <p>
          Encuéntranos fácilmente y visita nuestra tienda física.
        </p>
      </div>

      <div className="store-location-grid">
        <div className="store-map-card">
          <h2>Mapa</h2>

          <div className="map-container">
            <iframe
              title="Ubicación de Cyber"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.4386005390293!2d-84.7369051253992!3d9.980581390123819!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa031a6565b3475%3A0x4f7a40b7dfa129e9!2sCyber!5e0!3m2!1sen!2scr!4v1773165109002!5m2!1sen!2scr"
              width="100%"
              height="450"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className="store-info-card">
          <h2>Dirección</h2>

          <p>Cyber, Provincia de Puntarenas, Puntarenas, El Roble, Frente a Distribuidora Ocampo, 25 metros oeste de de la musmanni</p>

          <a
            className="location-btn"
            href="https://maps.app.goo.gl/bh9PHAqhjGkWmcoo9"
            target="_blank"
            rel="noreferrer"
          >
            Cómo llegar
          </a>

          {/* VIDEO DE LA TIENDA */}
          <div className="store-video">
            <h3>Visita nuestra tienda</h3>

            <video
              className="store-video-player"
              controls
              preload="metadata"
            >
              <source src="/videos/Ubicacion.mp4" type="video/mp4" />
              Tu navegador no soporta video.
            </video>
          </div>
        </div>
      </div>

      <div className="store-gallery">
        <h2>Fotos de la tienda</h2>

        <div className="store-gallery-grid">
          <img src="/Cyber entrada.webp" alt="Foto de la tienda 1" />
          <img src="/Cyber dentro.webp" alt="Foto de la tienda 2" />
          <img src="/Cyber dentro2.webp" alt="Foto de la tienda 3" />
        </div>
      </div>
    </div>
  );
};

export default StoreLocation;