const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const hasProperties = require("../errors/hasProperties");
const hasOnlyValidProperties = require("../errors/hasOnlyValidProperties");

const REQUIRED_PROPERTIES = [
  "first_name",
  "last_name",
  "mobile_number",
  "reservation_date",
  "reservation_time",
  "people",
];

const VALID_PROPERTIES = [
  ...REQUIRED_PROPERTIES,
  "status",
  "reservation_id",
  "created_at",
  "updated_at",
];

/**
 * Validates that the reservation_date has a valid date format (YYYY-MM-DD).
 * Employs a regular expression for efficient date format check.
 */
function validDate(req, res, next) {
  const { reservation_date } = req.body.data;
  // Regular expression for YYYY-MM-DD format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (regex.test(reservation_date)) {
    // Efficiently convert to a valid date object using Date constructor
    const date = new Date(reservation_date);
    Date(reservation_date)
    // Check if the date is valid (not a NaN value)
    if (!isNaN(date.getTime())) {
      return next();
    }
  }

  return next({
    status: 400,
    message: `reservation_date field formatted incorrectly: ${reservation_date}. Valid format is YYYY-MM-DD.`,
  });
}

// validation middleware: checks that reservation_time has a valid date value
function validTime(req, res, next) {
  const { reservation_time } = req.body.data;

  // Pre-compiled regex for efficiency (HH:MM)
  const timeRegex = /([01]?[0-9]|2[0-3]):[0-5][0-9]/;

  // Validate & continue or send error (400)
  return timeRegex.test(reservation_time)
    ? next()
    : next({
        status: 400,
        message: `Invalid reservation_time: ${reservation_time} (HH:MM expected)`,
      });
}

/**
 * Validates 'guests' field as an integer.

 */
function peopleIsNumber(req, res, next) {
  const { people } = req.body.data;
  // Validate & convert to integer (400 on fail)
  return Number.isInteger(people)
    ? next()
    : next({
        status: 400,
        message: `Invalid value entered: ${people}. Quantity of people must be an integer.`,
      });
}

//* Validates if reservation time falls within operating hours (10:30am - 9:30pm).

function duringOperatingHours(req, res, next) {
  const { reservation_time } = req.body.data;

  // Convert time to military format (efficient)
  const reservation = parseInt(reservation_time.replace(":", ""));

  // Check if reservation is between opening & closing hours (adjusted for military time)
  return reservation >= 1030 && reservation <= 2130
    ? next()
    : next({
        status: 400,
        message: "Reservations are only allowed between 10:30am and 9:30pm",
      });
}

// Validates if reservation is in the future (date & time).
function futureDate(req, res, next) {
  const { reservation_date, reservation_time } = req.body.data;

  // Combine date & time into single Date object (efficient)
  const reservation = new Date(`${reservation_date} EST`).setHours(
    reservation_time.substring(0, 2),
    reservation_time.substring(3)
  );

  // Check if reservation is after current time
  return reservation > Date.now()
    ? next()
    : next({
        status: 400,
        message: "Reservation must be in the future.",
      });
}

// Validates if reservation date is not a Tuesday.
function notTuesday(req, res, next) {
  const { reservation_date } = req.body.data;
  // Efficient Tuesday check using modulo operator (0 for Sunday)
  const isTuesday = new Date(reservation_date).getUTCDay() % 7 === 2;

  return isTuesday
    ? next({
        status: 400,
        message: "The restaurant is closed on Tuesday.",
      })
    : next();
}



// Validates reservation status on creation.
function bookedStatus(req, res, next) {
  const { status } = req.body.data;

  // Check if status is provided and allowed ("booked")
  if (status && status !== "booked") {
    return next({
      status: 400,
      message: `Invalid status: ${status} for new reservation. Only 'booked' allowed.`,
    });
  }
  // Status is either absent or valid ("booked") - continue processing
  return next();
}

//Fetches reservations by date (pending) or mobile number.
async function searchByDateOrPhone(req, res, next) {
  const { date, mobile_number } = req.query;
  // Handle date query (pending reservations)
  if (date) {
    const reservations = await service.list(date);
  

    if (reservations.length) {
      res.locals.data = reservations;
      return next();
    } else {
      return next({
        status: 404,
        message: `There are no pending reservations for ${date}`,
      });
    }
  }
  // Handle mobile number query (single reservation)
  if (mobile_number) {
    const reservation = await service.find(mobile_number);
    res.locals.data = reservation;
    return next();
  }
}

//checks if a reservation exists by Id
async function reservationExists(req, res, next) {
  const { reservationId } = req.params;
  const data = await service.read(reservationId);
  if (data) {
    res.locals.reservation = data;
    return next();
  } else {
    return next({
      status: 404,
      message: `reservation id: ${reservationId} does not exist.`,
    });
  }
}

//validates that the reservation status is one of four options in array
function validStatus(req, res, next) {
  const { status } = req.body.data;
  const validValues = ["booked", "seated", "finished", "cancelled"];
  if (validValues.includes(status)) {
    res.locals.status = status;
    return next();
  } else {
    return next({
      status: 400,
      message: `invalid status: ${status}. Status must be: ${validValues.join(
        ", "
      )}`,
    });
  }
}

//validates that a reservation is not finished before being updated
function statusNotFinished(req, res, next) {
  const { reservation } = res.locals;
  if (reservation.status === "finished") {
    return next({
      status: 400,
      message: "A finished reservation cannot be updated.",
    });
  } else {
    return next();
  }
}

// list reservations by date
function list(req, res) {
  const { data } = res.locals;
  res.json({ data: data });
}

//creates a reservation
async function create(req, res) {
  const reservation = await service.create(req.body.data);
  res.status(201).json({ data: reservation });
}

// returns a reservation by reservation_id
function read(req, res) {
  const { reservation } = res.locals;
  res.json({ data: reservation });
}

//updates reservation's status
async function updateStatus(req, res) {
  const { reservation, status } = res.locals;
  const updatedReservationData = {
    ...reservation,
    status: status,
  };
  const updatedReservation = await service.update(updatedReservationData);
  
  res.json({ data: updatedReservation });
}

//updates reservation info
async function updateReservation(req, res) {
  const { reservation } = res.locals;
  const { data } = req.body;
  const updatedReservationData = {
    ...reservation,
    ...data,
  };
  const updatedReservation = await service.update(updatedReservationData);
  res.json({ data: updatedReservation });
}

module.exports = {
  list: [asyncErrorBoundary(searchByDateOrPhone), list],
  create: [
    hasProperties(...REQUIRED_PROPERTIES),
    hasOnlyValidProperties(...VALID_PROPERTIES),
    validDate,
    validTime,
    peopleIsNumber,
    notTuesday,
    futureDate,
    duringOperatingHours,
    bookedStatus,
    asyncErrorBoundary(create),
  ],
  read: [asyncErrorBoundary(reservationExists), read],

  updateStatus: [
    hasProperties("status"),
    hasOnlyValidProperties("status"),
    asyncErrorBoundary(reservationExists),
    validStatus,
    statusNotFinished,
    asyncErrorBoundary(updateStatus),
  ],
  updateReservation: [
    hasProperties(...REQUIRED_PROPERTIES),
    hasOnlyValidProperties(...VALID_PROPERTIES),
    asyncErrorBoundary(reservationExists),
    validDate,
    validTime,
    peopleIsNumber,
    notTuesday,
    futureDate,
    duringOperatingHours,
    statusNotFinished,
    asyncErrorBoundary(updateReservation),
  ],
};
