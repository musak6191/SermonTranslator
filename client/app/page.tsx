import SermonTranslator from './components/SermonTranslator'

export default async function Page() {
  // Fetch data directly from the backend upon loading
  const res = await fetch('http://localhost:3000/status')
  const data = await res.json()

  return <SermonTranslator initialData={data} />
}