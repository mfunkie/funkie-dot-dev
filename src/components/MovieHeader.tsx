import { useNavigate, useSearch } from '@tanstack/react-router'

export function MovieHeader() {
  const search = useSearch({ from: '/movies' })
  const navigate = useNavigate({ from: '/movies' })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const searchQuery = formData.get('searchQuery') as string
        navigate({
          search: { searchQuery },
        })
      }}
    >
      <input
        className="movie-search-input"
        type="text"
        name="searchQuery"
        placeholder="Search"
        defaultValue={search.searchQuery ?? ''}
      />
    </form>
  )
}