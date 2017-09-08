function getGraphcoolHTTPFileEndpoint() {
    if (window.process.env.NODE_ENV === 'production') {
        return 'https://api.graph.cool/file/v1/cj48qaw2u6uyd01411y8gj8fr';
    }
    else {
        return 'https://api.graph.cool/file/v1/cj36de9q4dem00134bhkwm44r';
    }
}

export async function GQLSaveFile(file: File): FileResponse {
  if (!file) return;
  const data = new FormData();
  data.append('data', file);
  const response = await window.fetch(getGraphcoolHTTPFileEndpoint(), {
    method: 'POST',
    body: data
  });
  const json = await response.json();
  return json;
}
