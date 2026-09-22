import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function Documentos({ categoria }) {
    const [documentos, setDocumentos] = useState([])

    useEffect(() => {
        async function cargar() {
            const { data } = await supabase
                .from('documentos')
                .select('*')
                .in('categoria', [categoria, 'general'])
            setDocumentos(data || [])
        }
        cargar()
    }, [categoria])

    if (documentos.length === 0) return null

    return (
        <div>
            <h4>Documentos</h4>
            <ul>
                {documentos.map((doc) => (
                    <li key={doc.id_documento}>
                        <a href={doc.url_documento} target="_blank" rel="noreferrer">
                            {doc.nombre_documento}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}