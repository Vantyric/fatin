import React from "react";

export function JsonLd({ data }: { data: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
    >
      {JSON.stringify(data)}
    </script>
  );
}
