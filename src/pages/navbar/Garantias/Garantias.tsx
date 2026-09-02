import "./Garantias.css";

const ShippingReturns = () => {
  return (
    <div className="shipping-page">
      <div className="shipping-header">
        <h1>Garantías y devoluciones</h1>
        <p>
          Consulta nuestras políticas de garantía, devoluciones y el proceso de
          atención para brindarte un mejor servicio.
        </p>
      </div>

      <div className="shipping-grid">
        <section className="shipping-card">
          <h2>Política de garantía</h2>
          <p>
            Todos nuestros productos cuentan con garantía según las condiciones
            establecidas por la tienda y, cuando aplique, por el fabricante.
          </p>
          <p>
            La garantía cubre defectos de fabricación o fallas de funcionamiento
            que no hayan sido provocadas por mal uso, golpes, humedad,
            alteraciones o manipulación indebida del producto.
          </p>
        </section>

        <section className="shipping-card">
          <h2>Qué cubre la garantía</h2>
          <ul>
            <li>Defectos de fábrica.</li>
            <li>Fallas de funcionamiento no causadas por el usuario.</li>
            <li>Problemas de rendimiento atribuibles al producto.</li>
            <li>Revisión técnica del artículo dentro del período de garantía.</li>
          </ul>
        </section>

        <section className="shipping-card">
          <h2>Qué no cubre la garantía</h2>
          <ul>
            <li>Daños por golpes, caídas o accidentes.</li>
            <li>Daños por humedad, agua o sobrecargas eléctricas.</li>
            <li>Manipulación, reparación o alteración por terceros.</li>
            <li>Desgaste por uso normal.</li>
            <li>Daños por instalación incorrecta o mal uso.</li>
          </ul>
        </section>

        <section className="shipping-card">
          <h2>Proceso de garantía</h2>
          <ol>
            <li>Presentar el producto junto con la factura o comprobante.</li>
            <li>El equipo o accesorio será revisado por nuestro personal.</li>
            <li>Se determinará si aplica garantía según el diagnóstico.</li>
            <li>
              En caso de proceder, se gestionará reparación, cambio o solución
              equivalente según disponibilidad.
            </li>
          </ol>
        </section>

        <section className="shipping-card">
          <h2>Política de devoluciones</h2>
          <p>
            Las devoluciones podrán solicitarse dentro del plazo establecido por
            la tienda, siempre que el producto se encuentre en buenas
            condiciones, con su empaque original y accesorios completos.
          </p>
          <p>
            No se aceptan devoluciones de productos dañados por mal uso o que
            hayan sido alterados después de la compra.
          </p>
        </section>

        <section className="shipping-card">
          <h2>Condiciones para devoluciones</h2>
          <ul>
            <li>Presentar factura o comprobante de compra.</li>
            <li>Empaque original en buen estado.</li>
            <li>Accesorios, manuales y piezas completas.</li>
            <li>Solicitud dentro del plazo permitido.</li>
          </ul>
        </section>

        <section className="shipping-card shipping-card-full">
          <h2>Atención al cliente</h2>
          <p>
            Para consultas sobre garantías y devoluciones, puedes comunicarte
            con nuestro equipo de atención al cliente por medio de nuestros
            canales oficiales.
          </p>
          <div className="shipping-contact">
            <p><strong>Teléfono:</strong> +506 2664-0101</p>
            <p><strong>WhatsApp:</strong> +506 6162-1010</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ShippingReturns;