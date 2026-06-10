import { Card } from "wasp/entities";

export interface PlayingCardProps { card: Card; }

export const PlayingCard = ({card}: PlayingCardProps) => {
  return (
    <div className="hover-3d my-12 mx-2 cursor-pointer">
      <div className="card w-50 h-70 bg-gray-900 text-white border-2 border-white bg-[radial-gradient(circle_at_bottom_left,#ffffff04_35%,transparent_36%),radial-gradient(circle_at_top_right,#ffffff04_35%,transparent_36%)] bg-size-[4.95em_4.95em]">
        <div className="card-body">
          <div className="flex mb-10">
            <div className="font-bold text-3xl">{card.value}</div>
          </div>
          <div className="text-8xl text-center mb-4 opacity-70">{card.suit}</div>
          <div className="flex justify-end mb-10">
            <div className="font-bold text-3xl rotate-180">{card.value}</div>
          </div>
        </div>
      </div>
      {/* 8 empty divs needed for the 3D effect */}
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
}