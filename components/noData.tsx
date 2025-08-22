export default function NoData({ text }: { text: string }) {
  return (
    <div className="flex justify-center items-center text-3xl min-h-screen font-semibold">
      {text}
    </div>
  );
}
