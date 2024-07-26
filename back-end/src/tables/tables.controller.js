const service = require("./tables.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const hasProperties = require("../errors/hasProperties");
const hasOnlyValidProperties = require("../errors/hasOnlyValidProperties");
const reservationService = require("../reservations/reservations.service");

const VALID_PROPERTIES_POST = ["table_name", "capacity"];

const VALID_PROPERTIES_PUT = ["reservation_id"];

// validates table name is at least 2 characters
function tableNameLength(req, res, next) {
  const { table_name } = req.body.data;
  if (table_name.length > 1) {
    return next();
  } else {
    return next({
      status: 400,
      message: "table_name must be at least 2 characters in length.",
    });
  }
}

// validates that capacity is a number
function capacityIsNumber(req, res, next) {
  const { capacity } = req.body.data;
  const capacityNum = Number.isInteger(capacity);
  console.log(capacityNum);
  if (capacityNum) {
    return next();
  } else {
    return next({
      status: 400,
      message: `capacity field formatted incorrectly: ${capacity}. Needs to be a number.`,
    });
  }
}

// validates that table exists
async function tableExists(req, res, next) {
  const { table_id } = req.params;
  const data = await service.read(table_id);
  if (data) {
    res.locals.table = data;
    return next();
  } else {
    return next({
      status: 404,
      message: `table_id: ${table_id} does not exist.`,
    });
  }
}


// Checks if a reservation exists and is not already seated.

async function reservationExists(req, res, next) {
    const { reservation_id } = req.body.data;
    const reservation = await reservationService.read(reservation_id);
  
    // Handle both success and failure scenarios with separate status codes
    if (!reservation) {
      return next({ status: 404, message: `Reservation ${reservation_id} not found.` });
    } else if (reservation.status === "seated") {
      return next({ status: 400, message: `Reservation ${reservation_id} already seated.` });
    }
  
    res.locals.reservation = reservation;
    return next();
  }

// validate the table has the capacity to seat all guests
function tableCapacity(req, res, next) {
  const { capacity } = res.locals.table;
  const { people } = res.locals.reservation;
  if (capacity >= people) {
    return next();
  } else {
    return next({
      status: 400,
      message: `Table does not have sufficient capacity for ${people}.`,
    });
  }
}

// validate that a table is free
function tableStatusFree(req, res, next) {
  const { status } = res.locals.table;
  if (status === "Free") {
    return next();
  } else {
    return next({
      status: 400,
      message: "Table is currently occupied.",
    });
  }
}

// validates a table being occupied
function tableStatusOccupied(req, res, next) {
  const { status } = res.locals.table;
  if (status === "Occupied") {
    return next();
  } else {
    return next({
      status: 400,
      message: "Table is not occupied.",
    });
  }
}

// list all tables
async function list(req, res) {
  res.json({ data: await service.list() });
}

// creates a new table
async function create(req, res) {
  const table = await service.create(req.body.data);
  res.status(201).json({ data: table });
}

// seat a reservation at a table
async function seat(req, res) {
    const { table } = res.locals;
    const { reservation_id } = res.locals.reservation;
    const { table_id } = req.params;
    const updatedTableData = {
        ...table,
        table_id: table_id,
        reservation_id: reservation_id,
        status: "Occupied",
    }
    const updatedTable = await service.seat(updatedTableData);
    //update reservation status to seated
    const updatedReservation = {
        status: "seated", 
        reservation_id: reservation_id,
    }
    await reservationService.update(updatedReservation);
    res.json({ data: updatedTable });
}

// finish table
async function finish(req, res) {
  const { table_id } = req.params;
  const { table } = res.locals;
  const updatedTableData = {
    ...table,
    status: "Free",
  };
  const updatedTable = await service.finish(updatedTableData);
  // set reservation status to "finished"
  const updatedReservation = {
    status: "finished",
    reservation_id: table.reservation_id,
  };
  await reservationService.update(updatedReservation);
  res.json({ data: updatedTable });
}

module.exports = {
  list: asyncErrorBoundary(list),
  create: [
    hasProperties(...VALID_PROPERTIES_POST),
    hasOnlyValidProperties(...VALID_PROPERTIES_POST, "reservation_id"),
    tableNameLength,
    capacityIsNumber,
    asyncErrorBoundary(create),
  ],
  seat: [
    hasProperties(...VALID_PROPERTIES_PUT),
    hasOnlyValidProperties(...VALID_PROPERTIES_PUT),
    asyncErrorBoundary(tableExists),
    asyncErrorBoundary(reservationExists),
    tableCapacity,
    tableStatusFree,
    asyncErrorBoundary(seat),
  ],
  finish: [
    asyncErrorBoundary(tableExists),
    tableStatusOccupied,
    asyncErrorBoundary(finish),
  ],
};
