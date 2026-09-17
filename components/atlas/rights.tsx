import { ArrowUpRight } from 'lucide-react';
export function RightsAndAttribution() {
  return (
    <section className="rights-section">
      <div className="section-line">
        <h2>Licences & attribution</h2>
      </div>
      <p>
        Calgary Neighbourhood View is an independent, noncommercial project.
        Each source keeps its own terms; public access alone does not mean
        unrestricted reuse.
      </p>
      <div className="rights-grid">
        <article>
          <h3>Radon & sunlight</h3>
          <p>
            Radon data: Health Canada, Radon and Thoron Data From Canadian
            Homes, 2012–2013 Calgary CMA sample. Contains information licensed
            under the Open Government Licence – Canada. This app calculates the
            historical sample share; no government endorsement is implied.
          </p>
          <a
            href="https://open.canada.ca/en/open-government-licence-canada"
            target="_blank"
            rel="noreferrer"
          >
            Canada open licence <ArrowUpRight size={13} />
          </a>
          <a href="/data/radon.json" download>
            Radon extract & method <ArrowUpRight size={13} />
          </a>
          <p>
            Sun position uses original code implementing NOAA’s published
            astronomical equations. Orientation guidance is paraphrased from
            Natural Resources Canada. No third-party solar service, copied
            calculator code, research-report graphics or address-linked radon
            readings are included.
          </p>
        </article>
        <article>
          <h3>City open data</h3>
          <p>
            Contains information licensed under the Open Government Licence –
            City of Calgary.
          </p>
          <a
            href="https://data.calgary.ca/stories/s/Open-Calgary-Terms-of-Use/u45n-7awa/"
            target="_blank"
            rel="noreferrer"
          >
            City licence <ArrowUpRight size={13} />
          </a>
          <p>
            Assessment, census, transit, water, development, parks, boundaries
            and the historical crime extract are transformed from identified
            open datasets. Their source dates and limits remain visible.
          </p>
          <a href="/data/transit-routes.geojson" download>
            Bus & CTrain routes <ArrowUpRight size={13} />
          </a>
          <a href="/data/green-line.geojson" download>
            Planned Green Line & source notes <ArrowUpRight size={13} />
          </a>
        </article>
        <article>
          <h3>Maps & nearby places</h3>
          <p>
            © OpenStreetMap contributors. OpenStreetMap data is available under
            ODbL; OpenMapTiles and OpenFreeMap provide the vector basemap. The
            derived OSM amenity extracts are available separately with their
            metadata.
          </p>
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            OpenStreetMap copyright & licence <ArrowUpRight size={13} />
          </a>
          <p>
            Aerial viewing: © The City of Calgary, 2025. Imagery is viewed
            directly from the permitted City service and is excluded from
            downloadable data and research briefs.
          </p>
        </article>
        <article>
          <h3>Government observations & public offices</h3>
          <p>
            Data Source: Environment and Climate Change Canada. Contains
            information licensed under the Open Government Licence – Alberta.
            Census: adapted from Statistics Canada, 2021 Census of Population;
            no endorsement is implied.
          </p>
          <a
            href="https://eccc-msc.github.io/open-data/licence/readme_en/"
            target="_blank"
            rel="noreferrer"
          >
            ECCC data licence <ArrowUpRight size={13} />
          </a>
          <a
            href="https://open.alberta.ca/licence"
            target="_blank"
            rel="noreferrer"
          >
            Alberta open licence <ArrowUpRight size={13} />
          </a>
          <p>
            MP fields use the House of Commons designated open XML. Historical
            election information follows the election authorities’ noncommercial
            reproduction terms. Full titles, publishers, election dates and
            original links are retained with the records. Reproductions are
            unofficial and unendorsed.
          </p>
          <p>
            Current MLA names, parties and vacancy status are linked to the
            official Assembly directory. This demo reproduces no current MLA
            directory fields. Provincial district matching uses the separately
            sourced Elections Alberta boundaries described below.
          </p>
          <a
            href="https://www.assembly.ab.ca/members/members-of-the-legislative-assembly"
            target="_blank"
            rel="noreferrer"
          >
            Official MLA directory <ArrowUpRight size={13} />
          </a>
          <p>
            Source: Elections Canada, Electoral Geography Boundary Files (45th
            General Election) in vector format (ESRI shapefile, KMZ, GDB).
            Selected boundaries are unofficial reproductions of the{' '}
            <a href="https://www.elections.ca/res/cir/mapsCorner/vector/FederalElectoralDistricts_2025_KMZ.zip">
              original KMZ version
            </a>
            , converted to GeoJSON without simplifying its vertices.
          </p>
          <p>
            Source: Elections Alberta, Maps — Shapefiles: Electoral Divisions
            (effective March 19, 2019). The{' '}
            <a href="https://www.elections.ab.ca/uploads/2019Boundaries_ED-Shapefiles.zip">
              original shapefile vertices and attributes
            </a>{' '}
            are retained, with projection and file-format conversion. This
            reproduction is unofficial and unendorsed.
          </p>
        </article>
        <article>
          <h3>Calculations & linked material</h3>
          <p>
            Neighbourhood View’s calculations use individually sourced numeric
            facts and original formulas. Estimates are not official valuations
            or tax bills. Current CPS workbook figures and unconfirmed City
            profile-PDF extracts are linked at their original source rather than
            redistributed.
          </p>
          <p>
            Walkability and transit figures are original proximity estimates. No
            proprietary Walk Score or Transit Score data, Google imagery, MLS
            listing content, official crests or party logos are included.
          </p>
          <a
            href="/data/access-heuristic.json"
            target="_blank"
            rel="noreferrer"
          >
            Walkability assumptions <ArrowUpRight size={13} />
          </a>
        </article>
      </div>
      <p>
        Interface type: Lil Grotesk by Bastien Sozeau / NoirBlancRouge,
        self-hosted under the{' '}
        <a href="/fonts/lil-grotesk/OFL.txt" target="_blank" rel="noreferrer">
          SIL Open Font License 1.1
        </a>
        .
      </p>
      <div className="rights-downloads">
        <a href="/data/rights-register.json" download>
          Source reuse register <ArrowUpRight size={14} />
        </a>
        <a href="/PUBLIC-SHARING-REVIEW.md" download>
          Public-sharing review <ArrowUpRight size={14} />
        </a>
        <a href="/THIRD-PARTY-NOTICES.txt" target="_blank" rel="noreferrer">
          Software copyright & licence notices <ArrowUpRight size={14} />
        </a>
        <a
          href="/data/access-amenities-coverage.json"
          target="_blank"
          rel="noreferrer"
        >
          Amenity coverage & source dates <ArrowUpRight size={14} />
        </a>
      </div>
      <p className="quiet-note">
        Reviewed 16 September 2026 for the current noncommercial use. This is a
        source and rights review, not a legal clearance or a promise that every
        later use is permitted. Commercial services, advertising, brokerage
        promotion or redistribution of source archives need a fresh review.
      </p>
    </section>
  );
}
