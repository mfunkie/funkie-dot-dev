import { createFileRoute } from '@tanstack/react-router'

type MovieData = {
  Title: string
  Year: string
  Rated: string
  Released: string
  Runtime: string
  Genre: string
  Director: string
  Writer: string
  Actors: string
  Plot: string
  Language: string
  Country: string
  Awards: string
  Poster: string
  Ratings: { Source: string; Value: string }[]
  Metascore: string
  imdbRating: string
  imdbVotes: string
  imdbID: string
  Type: string
  DVD: string
  BoxOffice: string
  Production: string
  Website: string
}

export const Route = createFileRoute('/movies/$id')({
  loader: async ({ params }) => {
    const response = await fetch(
      `https://www.omdbapi.com/?i=${params.id}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`
    ).then((res) => res.json())

    return {
      movieData: response as MovieData,
    }
  },
  component: MovieDetail,
})

function MovieDetail() {
  const { movieData } = Route.useLoaderData()

  return (
    <div className="movie-detail-content">
      <div className="movie-detail-header">
        <div>
          <h2 className="movie-detail-title">{movieData.Title}</h2>
          <p className="movie-detail-year">{movieData.Year}</p>
          <p className="movie-detail-plot">{movieData.Plot}</p>
        </div>
      </div>
      <div className="movie-detail-grid">
        {!isEmpty(movieData.Genre) ? (
          <>
            <span className="movie-detail-label">Genre</span>
            <p className="movie-detail-value">{movieData.Genre}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Director) ? (
          <>
            <span className="movie-detail-label">Director</span>
            <p className="movie-detail-value">{movieData.Director}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Writer) ? (
          <>
            <span className="movie-detail-label">Writer</span>
            <p className="movie-detail-value">{movieData.Writer}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Actors) ? (
          <>
            <span className="movie-detail-label">Actors</span>
            <p className="movie-detail-value">{movieData.Actors}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Language) ? (
          <>
            <span className="movie-detail-label">Language</span>
            <p className="movie-detail-value">{movieData.Language}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Country) ? (
          <>
            <span className="movie-detail-label">Country</span>
            <p className="movie-detail-value">{movieData.Country}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Awards) ? (
          <>
            <span className="movie-detail-label">Awards</span>
            <p className="movie-detail-value">{movieData.Awards}</p>
          </>
        ) : null}
        {movieData.Ratings && movieData.Ratings.length > 0 ? (
          <>
            <span className="movie-detail-label">Ratings</span>
            <ul className="movie-detail-ratings">
              {movieData.Ratings.map((rating) => (
                <li key={rating.Source}>
                  {rating.Source}: {rating.Value}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {!isEmpty(movieData.Metascore) ? (
          <>
            <span className="movie-detail-label">Metascore</span>
            <p className="movie-detail-value">{movieData.Metascore}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Type) ? (
          <>
            <span className="movie-detail-label">Type</span>
            <p className="movie-detail-value">{movieData.Type}</p>
          </>
        ) : null}
        {!isEmpty(movieData.DVD) ? (
          <>
            <span className="movie-detail-label">DVD</span>
            <p className="movie-detail-value">{movieData.DVD}</p>
          </>
        ) : null}
        {!isEmpty(movieData.BoxOffice) ? (
          <>
            <span className="movie-detail-label">Box Office</span>
            <p className="movie-detail-value">{movieData.BoxOffice}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Production) ? (
          <>
            <span className="movie-detail-label">Production</span>
            <p className="movie-detail-value">{movieData.Production}</p>
          </>
        ) : null}
        {!isEmpty(movieData.Website) ? (
          <>
            <span className="movie-detail-label">Website</span>
            <p className="movie-detail-value">
              <a href={movieData.Website}>{movieData.Website}</a>
            </p>
          </>
        ) : null}
        <>
          <span className="movie-detail-label">IMDB</span>
          <a
            className="movie-detail-link"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.imdb.com/title/${movieData.imdbID}`}
          >
            Link
          </a>
        </>
      </div>
    </div>
  )
}

function isEmpty(str: string | undefined) {
  return !str || str.trim() === '' || str === 'N/A'
}