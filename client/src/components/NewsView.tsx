import React, { useEffect, useState } from 'react';
import { ArrowLeft, Rss, ExternalLink, Search } from 'lucide-react';

interface NewsViewProps {
  onBack: () => void;
}

export const NewsView: React.FC<NewsViewProps> = ({ onBack }) => {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('Latest tech news');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    setLoading(true);
    const query = encodeURIComponent(searchQuery);
    const rss = encodeURIComponent(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`);
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rss}`)
      .then(res => res.json())
      .then(data => {
        setArticles(data.items || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    }
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="btn btn-outline" style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={18} /> Back
        </button>
        <h1 className="responsive-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, fontSize: '2.5rem' }}>
          <Rss color="var(--success)" /> Tech Industry Updates
        </h1>
      </div>

      <div style={{ marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600 }}>
          Curated global updates. Use the search below to track new technology related news.
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', maxWidth: '600px' }}>
          <input 
            type="text" 
            placeholder="Search news (e.g. 'Software QA')..." 
            className="input-field" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1, padding: '0.8rem 1.2rem', fontSize: '1rem', boxSizing: 'border-box' }} 
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px', border: 'none' }}>
            <Search size={18} /> Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', fontSize: '1.2rem' }}>Searching for "{searchQuery}"...</div>
      ) : articles.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem', fontSize: '1.2rem' }}>No articles found for "{searchQuery}".</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {articles.map((item, i) => {
            const domain = item.link ? new URL(item.link).hostname.replace('www.', '') : '';
            return (
              <a 
                key={i} 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="card news-card-hover"
                style={{ padding: '1.5rem', textDecoration: 'none', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--item-border)' }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 900, marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  {domain}
                </div>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 700 }}>
                  {item.title}
                </h3>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--item-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 800 }}>
                  <span>{new Date(item.pubDate).toLocaleDateString()}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent)' }}>
                    Read Article <ExternalLink size={14} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
