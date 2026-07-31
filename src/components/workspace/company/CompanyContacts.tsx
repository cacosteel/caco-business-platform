export default function CompanyContacts({
  contacts,
}: any) {

  return (

    <div className="bg-white rounded-lg shadow overflow-hidden">

      <table className="w-full">

        <thead className="bg-gray-100">

          <tr>

            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Phone</th>

          </tr>

        </thead>

        <tbody>

          {(contacts || []).map((contact: any) => (

            <tr
              key={contact.id}
              className="border-t"
            >

              <td className="p-3">
                {contact.name}
              </td>

              <td className="p-3">
                {contact.email}
              </td>

              <td className="p-3">
                {contact.phone}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}