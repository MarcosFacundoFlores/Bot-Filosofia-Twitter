export interface RawQuoteData {
  year: string;
  quote: string;
  philosopher: {
    name: string;
    wikiTitle: string;
    school: string;
  };
  school: string;
}

export interface Quote {
  year: string;
  quote: string;
  philosopher: string;
  school?: string;
}
