import {getGraphcoolHTTPFileEndpoint} from './utilities-service';

export async function GQLSaveFile(file: File): FileResponse {
  const data = new FormData();
  data.append('data', file);
  const response = await window.fetch(getGraphcoolHTTPFileEndpoint(), {
    method: 'POST',
    body: data
  });
  const json = await response.json();
  return json;
}
