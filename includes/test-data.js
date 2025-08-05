export const getMonthAndDay = () => {
	const date = new Date();
	const month = date.toLocaleString('en-US', { month: 'long' });
	const day = date.getDate();
	return `${month}${day}`;
};

const testParamString = `${getMonthAndDay()}test`;

export const parameters = {
	utm_source: testParamString,
	utm_content: testParamString,
	utm_term: testParamString,
	utm_campaign: testParamString,
	utm_medium: testParamString,
	gclid: testParamString,
	ttclid: testParamString,
	yclid: testParamString,
	msclid: testParamString,
	dclid: testParamString,
	fbclid: testParamString,
	twclid: testParamString,
	// honeypot: testParamString,
	// LeadHOOP_ID__c: '123456789',
};
