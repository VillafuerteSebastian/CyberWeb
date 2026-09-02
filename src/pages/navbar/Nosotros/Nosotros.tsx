import "./Nosotros.css";

const About = () => {
  return (
    <div className="about-page">
      <div className="about-header">
        <h1>Sobre nosotros</h1>
        <p>
          Conoce más sobre nuestra tienda, nuestro compromiso con la tecnología
          y la atención a nuestros clientes.
        </p>
      </div>

      <div className="about-grid">

        {/* QUIENES SOMOS */}
        <div className="about-card">
          <h2>Quiénes somos</h2>
          <p>
            Somos una tienda especializada en la venta de productos tecnológicos,
            accesorios y equipos de computación. Nuestro objetivo es ofrecer
            productos de calidad junto con un servicio confiable y cercano a
            nuestros clientes.
          </p>
        </div>

        {/* MISION */}
        <div className="about-card">
          <h2>Misión</h2>
          <p>
            Brindar a nuestros clientes soluciones tecnológicas accesibles y de
            calidad, mediante la comercialización de equipos, accesorios y
            productos especializados en el área de computación y tecnología.
            Nos comprometemos a ofrecer una atención personalizada, asesoría
            confiable y un servicio eficiente que satisfaga las necesidades del
            mercado local.
          </p>
        </div>

        {/* VISION */}
        <div className="about-card">
          <h2>Visión</h2>
          <p>
            Ser una tienda líder en la comercialización de tecnología a nivel
            local y regional, reconocida por la variedad de nuestros productos,
            la innovación constante y la excelencia en el servicio al cliente.
            Aspiramos a crecer de manera sostenible, incorporando nuevas líneas
            tecnológicas y fortaleciendo nuestra presencia en el sector
            comercial.
          </p>
        </div>

        {/* CONTACTO */}
        <div className="about-card">
          <h2>Contacto</h2>
          <p><strong>Teléfono:</strong> +506 2664-0101</p>
          <p><strong>WhatsApp:</strong> +506 6162-1010</p>
        </div>

        {/* HORARIO */}
        <div className="about-card">
          <h2>Horario</h2>
          <p><strong>Lunes a Sábado:</strong> 9:00 AM - 6:00 PM</p>
          <p><strong>Domingo:</strong> Cerrado</p>
        </div>

      </div>
    </div>
  );
};

export default About;