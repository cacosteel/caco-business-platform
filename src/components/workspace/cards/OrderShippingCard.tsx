import ShipmentSummary from "../shipment/ShipmentSummary";
import ShipmentTracking from "../shipment/ShipmentTracking";
import ContainerDetails from "../shipment/ContainerDetails";

export default function OrderShippingCard() {

  return (

    <div className="space-y-6">

      <ShipmentSummary />

      <ContainerDetails />

      <ShipmentTracking />

    </div>

  );

}