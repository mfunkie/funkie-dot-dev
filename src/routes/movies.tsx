import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { MovieHeader } from '~/components/MovieHeader'
import { TitleWithNav } from '~/components/Title'

type SearchMovie = {
  Title: string
  Year: string
  imdbID: string
  Type: string
  Poster: string
}

type MoviesSearch = {
  searchQuery?: string
}

export const Route = createFileRoute('/movies')({
  validateSearch: (search: Record<string, unknown>): MoviesSearch => {
    return {
      searchQuery: (search.searchQuery as string) || undefined,
    }
  },
  loaderDeps: ({ search: { searchQuery } }) => ({ searchQuery }),
  loader: async ({ deps: { searchQuery } }) => {
    if (!searchQuery) {
      return { movies: [] }
    }

    const search = await fetch(
      `https://www.omdbapi.com/?s=${searchQuery}&apikey=${import.meta.env.VITE_OMDB_API_KEY}`
    ).then((res) => res.json())

    return {
      movies: (search.Search ?? []) as SearchMovie[],
    }
  },
  component: MoviesLayout,
})

function MoviesLayout() {
  const { movies } = Route.useLoaderData()
  const { searchQuery } = Route.useSearch()
  const params = Route.useParams()

  return (
    <div className="movies-layout">
      <TitleWithNav>Movies</TitleWithNav>
      <MovieHeader />
      <div className="movies-content">
        <div className="movies-list">
          {movies.map((movie) => (
            <Link
              key={movie.imdbID}
              to="/movies/$id"
              params={{ id: movie.imdbID }}
              search={{ searchQuery }}
              className={`movie-item ${params.id === movie.imdbID ? 'movie-item-active' : ''}`}
            >
              {movie.Poster && movie.Poster !== 'N/A' ? (
                <img
                  className="movie-poster"
                  src={movie.Poster}
                  alt={movie.Title}
                />
              ) : (
                <div className="movie-poster-placeholder"></div>
              )}
              <div className="movie-info">
                <h2 className="movie-title">{movie.Title}</h2>
                <p className="movie-year">{movie.Year}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="movie-detail">
          <Outlet />
        </div>
      </div>
    </div>
  )
}